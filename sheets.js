/* eslint-disable camelcase */
/**
 * Based on exampled copied from https://github.com/googleworkspace/node-samples/blob/master/sheets/quickstart
 *   so applying the same licence.
 */

/*
 * This version uses a depricated method of authentication.
 */

import { readFile, writeFile } from 'fs/promises';
// eslint-disable-next-line import/no-unresolved
import { createInterface } from 'node:readline/promises';
import { google } from 'googleapis';

// If modifying these scopes, delete token.json.
const READONLY_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const WRITE_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const READONLY_TOKEN_PATH = 'readonly-token.json';
const WRITE_TOKEN_PATH = 'write-token.json';

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 * Returns a Promise.
 */
function getNewToken(oAuth2Client, callback, scopes, tokenPath) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return rl.question('Enter the code from that page here: ')
        .then((code) => {
            rl.close();

            return new Promise((resolve, reject) => {
                oAuth2Client.getToken(code, (err, token) => ((err) ? reject(err) : resolve(token)));
            });
        })
        .catch((err) => {
            console.error('Error while trying to retrieve access token', err);
        })
        .then((token) => {
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            return writeFile(tokenPath, JSON.stringify(token))
                .catch((err) => {
                    console.error(err);
                })
                .then(() => {
                    console.log('Token stored to', tokenPath);
                    return callback(oAuth2Client);
                });
        });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, scopes, tokenPath) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    console.log('authorise');
    // Check if we have previously stored a token.
    return readFile(tokenPath)
        .then((token) => {
            oAuth2Client.setCredentials(JSON.parse(token));
            return callback(oAuth2Client);
        })
        .catch((err) => {
            console.error(`no existing credentials:${err}`);
            return getNewToken(oAuth2Client, callback, scopes, tokenPath);
        });
}

// Function to fetch google sheets data as a promise, pass in the params, e.g.:
// {
//    spreadsheetId: '1Ry9_4eI_VE74wCx0RwGmi9WqJ6fd_gAdnrDvNb-HQow',
//    range: 'Key Dates - Sorted!A:K',
//  }
function getSheetsData(sheetsParams) {
    // embed the params into a callback function that will receive auth from authorize
    // and call sheets api to fetch data and return it in a promise
    const callback = (auth) => {
        console.log('in callback');
        const sheets = google.sheets({ version: 'v4', auth });

        return new Promise((resolve, reject) => {
            sheets.spreadsheets.values.get(
                sheetsParams,
                (err, res) => ((err) ? reject(err) : resolve(res.data.values))
            );
        })
            .then((rows) => {
                if (rows.length > 1) {
                    const [colHeadings, dataRows] = [rows[0], rows.slice(1)];
                    console.log(`colHeadings: ${colHeadings}\ndataRows count: ${dataRows.length}`);
                    return { colHeadings, dataRows };
                }
                console.log('No data found.');
                return { colHeadings: [], dataRows: [] };
            })
            .catch((err) => console.error(`The API returned an error: ${err}`));
    };

    return readFile('credentials.json')
        // Authorize a client with credentials, then call the Google Sheets API.
        //! ! callback just takes an auth token, so I need to curry it first...
        .then((content) => authorize(JSON.parse(content), callback, READONLY_SCOPES, READONLY_TOKEN_PATH));
}

// Function to update google sheets data as a promise, pass in the params, e.g.:
// {
//     < auth: this._auth, --- will get the auth as part of method, no need to pass it in >
//     spreadsheetId: this._metaData.spreadSheetId, "1Mk-Ru1q3ilwkSHDmNJOZhqZdUTMTPTawPJGqS70wL1s"
//     range: range, 'playground!A:K'
//     valueInputOption: "USER_ENTERED",
//     resource: { range: "Sheet1!A1", majorDimension: "ROWS", values: [["b"]] },
//   }
//
// Can play with options in the google docs here:
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
function setSheetsData(sheetsParams) {
    // embed the params into a callback function that will receive auth from authorize
    // and call sheets api to fetch data and return it in a promise
    const callback = (auth) => {
        console.log('in callback');
        const sheets = google.sheets({ version: 'v4', auth });

        return new Promise((resolve, reject) => {
            sheets.spreadsheets.values.update(
                {
                    auth,
                    ...sheetsParams
                },
                (err, resp) => ((err) ? reject(err) : resolve(resp))
            );
        })
            .then((resp) => resp.data.updatedRows) // console.log(resp); // a very rich response with lots of useful info
            .catch((err) => console.error(`The API returned an error: ${err}`));
    };

    return readFile('credentials.json')
        // Authorize a client with credentials, then call the Google Sheets API.
        //! ! callback just takes an auth token, so I need to curry it first...
        .then((content) => authorize(JSON.parse(content), callback, WRITE_SCOPES, WRITE_TOKEN_PATH));
}

export { getSheetsData, setSheetsData };
