#!/bin/bash

# paths can be relative to the current user that owns the crontab configuration

# $(which node) returns the path to the current node version
# either the one specified as `default` alias in NVM or a specific version set above
# executing `nvm use 4 1> /dev/null` here won't work!
# $(which node) ~/path/script.js

echo $(date);
cd /Users/alan.gordon1/Documents/src/ocado/mystuff/upcoming-releases;
echo $(date);
/Users/alan.gordon1/.nvm/versions/node/v17.4.0/bin/node update-upcoming-installs.js;
# $(which node) ~/Documents/src/ocado/mystuff/upcoming-releases/update-upcoming-installs.js
# $(which npm) run start;
