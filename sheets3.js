/* eslint-disable camelcase */
/**
 * Based on exampled copied from https://github.com/googleworkspace/node-samples/blob/master/sheets/quickstart
 *   so applying the same licence.
 */

/*
 * This is the verison that uses an updated version of authentication.
 */

/*
 * This version doesn't use express.
 */

import fs from 'fs';
import http from 'http';
import url from 'url';
import opn from 'open';
import destroyer from 'server-destroy';
import { google } from 'googleapis';

const READONLY_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const WRITE_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Create an oAuth2 client to authorize the API call
const oauth2Client = (() => {
    const keyfile = 'credentials.json';
    const keys = JSON.parse(fs.readFileSync(keyfile));
    return new google.auth.OAuth2(
        keys.web.client_id,
        keys.web.client_secret,
        keys.web.redirect_uris[0]
    );
})();

/**
 * This is one of the many ways you can configure googleapis to use authentication credentials.
 * In this method, we're setting a global reference for all APIs.  Any other API you use here,
 * like google.drive('v3'), will now use this auth client. You can also override the auth client
 * at the service and method call levels.
 */
google.options({ auth: oauth2Client });

/**
 * Open an http server to accept the oauth callback.
 * In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticatePromise(scopes) {
    const handleRequestWithCode = async (req, res, server, resolve, reject) => {
        // When the request comes in with the code, we can can respond success and resolve/reject the authentication Promise.
        // This is an async func so it could return a promise, but that would be ignored by http.createServer()
        // - we're just using async so we can await getToken().
        try {
            if (req.url.indexOf('/oauth2callback') > -1) {
                const qs = new url.URL(req.url, 'http://localhost:3000')
                    .searchParams;
                res.end('Authentication successful! Please return to the console.');
                server.destroy();

                const { tokens } = await oauth2Client.getToken(qs.get('code'));

                oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
                resolve(oauth2Client);
            }
        } catch (e) {
            reject(e);
        }
    };

    const openBrowserAtAuthorizationUrl = (authorizeUrl) => {
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl, { wait: false }).then((cp) => cp.unref());
    };

    return new Promise((resolve, reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
        });
        const server = http
            .createServer((req, res) => handleRequestWithCode(req, res, server, resolve, reject))
            .listen(3000, openBrowserAtAuthorizationUrl(authorizeUrl));
        destroyer(server);
    });
}

// Function to fetch google sheets data as a promise, pass in the params, e.g.:
// {
//    spreadsheetId: '1Ry9_4eI_VE74wCx0RwGmi9WqJ6fd_gAdnrDvNb-HQow',
//    range: 'Key Dates - Sorted!A:K',
//  }
async function getSheetsDataPromise(sheetsParams) {
    // embed the params into a callback function that will receive auth from authorize
    // and call sheets api to fetch data and return it in a promise
    const callback = async (auth) => {
        const sheets = google.sheets({ version: 'v4', auth });

        const getSheetValuesPromise = () => new Promise((resolve, reject) => {
            sheets.spreadsheets.values.get(
                sheetsParams,
                (err, res) => ((err) ? reject(err) : resolve(res.data.values))
            );
        });

        const extractHeadingsAndRows = (rows) => {
            const [colHeadings, dataRows] = [rows[0], rows.slice(1)];
            console.log(`colHeadings: ${colHeadings}\ndataRows count: ${dataRows.length}`);
            return { colHeadings, dataRows };
        };

        try {
            const rows = await getSheetValuesPromise();

            if (rows.length > 1) {
                return extractHeadingsAndRows(rows);
            }
            console.log('No data found.');
            return { colHeadings: [], dataRows: [] };
        } catch (e) {
            console.error(`The API returned an error: ${e}`);
            return e;
        }
    };

    try {
        const client = await authenticatePromise([READONLY_SCOPES]);

        return await callback(client);
    } catch (e) {
        console.error(e);
        return e;
    }
}

// Function to update google sheets data as a promise, pass in the params, e.g.:
// {
//     < auth: this._auth, --- will get the auth as part of method, no need to pass it in >
//     spreadsheetId: this._metaData.spreadSheetId, "1Mk-Ru1q3ilwkSHDmNJOZhqZdUTMTPTawPJGqS70wL1s"
//     range: range, 'playground!A:K'
//     valueInputOption: "USER_ENTERED",
//     resource: { range: "Sheet1!A1", majorDimension: "ROWS", values: [["b"]] },
//   }

// Can play with options in the google docs here:
// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
async function setSheetsDataPromise(sheetsParams) {
    // embed the params into a callback function that will receive auth from authorize
    // and call sheets api to fetch data and return it in a promise
    const callback = async (auth) => {
        const sheets = google.sheets({ version: 'v4', auth });

        const updateSheetValuesPromise = () => new Promise((resolve, reject) => {
            sheets.spreadsheets.values.update(
                { auth, ...sheetsParams },
                (err, resp) => ((err) ? reject(err) : resolve(resp))
            );
        });

        try {
            const resp = await updateSheetValuesPromise();

            return resp.data.updatedRows;
        } catch (e) {
            console.error(`The API returned an error: ${e}`);
            return e;
        }
    };

    try {
        const client = await authenticatePromise([WRITE_SCOPES]);

        return await callback(client);
    } catch (e) {
        console.error(e);
        return e;
    }
}

export { getSheetsDataPromise, setSheetsDataPromise };
