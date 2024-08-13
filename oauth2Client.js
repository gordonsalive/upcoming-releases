import { google } from 'googleapis';
import fs from 'fs';


// Create an oAuth2 client to authorize the API call
const getNewOauth2Client = () => {
    const keyfile = 'credentials.json';
    const keys = JSON.parse(fs.readFileSync(keyfile));
    return new google.auth.OAuth2(
        keys.web.client_id,
        keys.web.client_secret,
        keys.web.redirect_uris[0]
    );
};

const oauth2Client = getNewOauth2Client();

export default oauth2Client;