/* eslint-disable no-console */
// we're going to get the upcoming releases
// then we'll open the upcoming release spreadsheet
// and we'll write the data into it (it's already sorted)
//
// spreadsheet headings:
// 'Site', 'Handover to HH/RR', 'Deployment start HR/RR', 'Deployment end HR/RR'
// (note F1 is the last updated label and date)

// TODO: tidy this up to use async await

import getKeyDatesPromise from './key-dates.js';
import { setSheetsDataPromise } from './sheets3.js';
import sheetsConfig from './sheets-config.js';

getKeyDatesPromise()
    .then((upcomingInstallations) => {
        const now = (new Date()).toUTCString();
        console.log(`updating Upcoming Installations spreadsheet ${now}`);
        const headings = ['Site', 'Handover to HH/RR', 'Deployment start HR/RR', 'Deployment end HR/RR', '', `last updated: ${now}`];
        const CFCs = Object.keys(upcomingInstallations);
        // just grab the date of each event for each CFC and flatten to a single row for each CFC
        const installations = CFCs.map((CFC) => [CFC, ...upcomingInstallations[CFC].map((event) => event[0])]);
        const rows = [headings, ...installations];
        return setSheetsDataPromise({
            spreadsheetId: sheetsConfig.upcomingInstallationsSpreadsheet,
            range: 'Dates!A:K',
            valueInputOption: 'USER_ENTERED',
            resource: {
                majorDimension: 'ROWS',
                values: rows
            },
        });
    })
    .then((res) => console.log(`Rows updated: ${res}`))
    .catch((err) => console.error(`Error: ${err}`));
