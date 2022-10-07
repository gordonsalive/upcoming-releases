#!/bin/bash

# NVM needs the ability to modify your current shell session's env vars,
# which is why it's a sourced function
echo $(date);

# found in the current user's .bashrc - update [user] below with your user!
# export NVM_DIR="/home/alan.gordon1/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

# uncomment the line below if you need a specific version of node
# other than the one specified as `default` alias in NVM (optional)
# nvm use 17 1> /dev/null

