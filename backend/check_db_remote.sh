#!/bin/bash
sudo -u postgres psql -d prediction_db <<EOF
SELECT count(*) as global_settings_count FROM "GlobalSettings";
SELECT count(*) as users_count FROM "Users";
EOF
