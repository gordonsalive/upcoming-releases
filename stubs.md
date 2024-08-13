This file contains stubs for the missing files

credentials.json
You'll download this (see where it is used for details)
```
{"web":{"client_id":"","project_id":"","auth_uri":"","token_uri":"","auth_provider_x509_cert_url":"","client_secret":"","redirect_uris":[""]}}
```

sheets-config.js
The spreadsheet ids are the long UIDs that google gives them that you can see in the URLs
```
const config = {
    upcomingInstallationsSpreadsheet: '',
    keyDatesSpreadsheet: '',
}

export default config;
```