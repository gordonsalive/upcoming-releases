/* eslint-disable camelcase */
/**
 * Based on exampled copied from https://github.com/googleworkspace/node-samples/blob/master/sheets/quickstart
 *   so applying the same licence.
 */

/*
 * This is the verison that uses an updated version of authentication.
 */

import { google } from 'googleapis';
import opn from 'open';
import express from 'express';
import fs from 'fs';

const READONLY_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const WRITE_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const keyfile = 'credentials.json';
const keys = JSON.parse(fs.readFileSync(keyfile));

// Create an oAuth2 client to authorize the API call
const client = new google.auth.OAuth2(
    keys.web.client_id,
    keys.web.client_secret,
    keys.web.redirect_uris[0]
);

const authorizationUrls = (() => {
    // a function that takes in a scope like READONLY_TOKEN_PATH and returns authorization URL
    const authorizeUrlForScope = (scopes) => client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    return {
        readonly: authorizeUrlForScope(READONLY_SCOPES),
        write: authorizeUrlForScope(WRITE_SCOPES)
    };
})();

// Code that proves that a promise being rejected acts as an exception and drops to catch in an async function
// const reject1 = () => Promise.reject('reject 1');
// const reject2 = () => Promise.reject('reject 2');
// const awaitTwice = async () => {
//     console.log('in awaitTwice');
//     try {
//         console.log('before reject 1');
//         await reject1();
//         // await reject1().catch((e) => { throw e; });
//         console.log('after reject 1');
//         await reject2();
//         // await reject2().catch((e) => { throw e; });
//         console.log('after reject 2');
//     } catch (e) {
//         console.log(' it was caught now - ', e);
//     }
// };
// awaitTwice();

async function authoriseAndCallCallback(callback, authorizationUrl) {
    const openExpressServerPromise = () => new Promise((resolve) => {
        // Open an http server to accept the oauth callback. In this case, the only request to our webserver is to /oauth2callback?code=<code>
        // create express app
        const app = express();
        // creating server to listen on port 3000 with event to start whole process
        const server = app.listen(3000, () => {
            // open the browser to the authorize url to start the workflow
            opn(authorizationUrl, { wait: false });
        });
        resolve({ app, server });
    });

    const listenForAuthAndSetGoogleClientCredentialsPromise = (app) => new Promise((resolve, reject) => {
        const handleGetTokenErr = (err) => {
            // eslint-disable-next-line no-console
            console.error('Error getting oAuth tokens:', err);
            throw err;
        };

        const handleGetTokenSuccess = (tokens, res) => {
            client.credentials = tokens;
            res.send('Authentication successful! Please return to the console.');
        };

        try {
            // set express to immediately start listening for auth callback supplying the code we need to use
            app.get(
                '/oauth2callback',
                // when request is made to us, extract code from qry params and call google api client.getToken
                (req, res) => client.getToken(
                    req.query.code,
                    //  getTokens asynchronously responds with error or token which we will add to our client
                    (err, tokens) => ((err) ? handleGetTokenErr(err) : resolve(handleGetTokenSuccess(tokens, res)))
                )
            );
        } catch (e) {
            reject(e);
        }
    });

    // TODO: I should add timeout handling
    const { app, server } = await openExpressServerPromise();
    try {
        await listenForAuthAndSetGoogleClientCredentialsPromise(app);
        return await callback(client);
    } finally {
        server.close();
    }

    // this is the same code as Promise.then().finally();
    // return openExpressServerPromise()
    //     .then(({ app, server }) => listenForAuthAndSetGoogleClientCredentialsPromise(app)
    //         .then(() => {
    //             callback(client);
    //         })
    //         .finally(() => {
    //             console.log('closing express server');
    //             server.close();
    //         }));
}

// Function to fetch google sheets data as a promise, pass in the params, e.g.:
// {
//    spreadsheetId: '1Ry9_4eI_VE74wCx0RwGmi9WqJ6fd_gAdnrDvNb-HQow',
//    range: 'Key Dates - Sorted!A:K',
//  }
function getSheetsData(sheetsParams) {
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

        try {
            const rows = await getSheetValuesPromise();
            if (rows.length > 1) {
                const [colHeadings, dataRows] = [rows[0], rows.slice(1)];
                // eslint-disable-next-line no-console
                console.log(`colHeadings: ${colHeadings}\ndataRows count: ${dataRows.length}`);
                return { colHeadings, dataRows };
            }
            // eslint-disable-next-line no-console
            console.log('No data found.');
            return { colHeadings: [], dataRows: [] };
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`The API returned an error: ${e}`);
            return e;
        }

        // same code as Promise.then().catch()
        // return new Promise((resolve, reject) => {
        //     console.log('about to call sheets.spreadsheets.values.get');
        //     sheets.spreadsheets.values.get(
        //         sheetsParams,
        //         (err, res) => ((err) ? reject(err) : resolve(res.data.values))
        //     );
        // })
        //     .then((rows) => {
        //         if (rows.length > 1) {
        //             const [colHeadings, dataRows] = [rows[0], rows.slice(1)];
        //             console.log(`colHeadings: ${colHeadings}\ndataRows count: ${dataRows.length}`);
        //             return { colHeadings, dataRows };
        //         }
        //         console.log('No data found.');
        //         return { colHeadings: [], dataRows: [] };
        //     })
        //     .catch((err) => console.error(`The API returned an error: ${err}`));
    };

    return authoriseAndCallCallback(callback, authorizationUrls.readonly);
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
function setSheetsData(sheetsParams) {
    // embed the params into a callback function that will receive auth from authorize
    // and call sheets api to fetch data and return it in a promise
    const callback = async (auth) => {
        const sheets = google.sheets({ version: 'v4', auth });

        const updateSheetValuesPromise = () => new Promise((resolve, reject) => {
            sheets.spreadsheets.values.update(
                {
                    auth,
                    ...sheetsParams
                },
                (err, resp) => ((err) ? reject(err) : resolve(resp))
            );
        });

        try {
            const resp = await updateSheetValuesPromise();
            return resp.data.updatedRows;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`The API returned an error: ${e}`);
            return e;
        }

        // same code as Promise.then().catch()
        // return new Promise((resolve, reject) => {
        //     sheets.spreadsheets.values.update(
        //         {
        //             auth,
        //             ...sheetsParams
        //         },
        //         (err, resp) => ((err) ? reject(err) : resolve(resp))
        //     );
        // })
        //     .then((resp) => resp.data.updatedRows) // console.log(resp); // a very rich response with lots of useful info
        //     .catch((err) => console.error(`The API returned an error: ${err}`));
    };

    return authoriseAndCallCallback(callback, authorizationUrls.write);
}

export { getSheetsData, setSheetsData };
