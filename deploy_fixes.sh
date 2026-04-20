#!/bin/bash
FILES=(
  "apps/invoicex/config/db/index.js"
  "apps/physiquex/config/db/index.js"
  "apps/travelx/config/db/index.js"
  "apps/buildx/config/db/index.js"
  "apps/wheelx/config/db/index.js"
  "apps/wheelx/api/sale/sale.service.js"
)

for file in "${FILES[@]}"; do
  echo "Deploying $file..."
  B64_CONTENT=$(base64 -w 0 "$file")
  ssh -o BatchMode=yes -o StrictHostKeyChecking=no root@68.183.89.205 "mkdir -p \$(dirname /root/wheelx-server/\"$file\") && echo \"$B64_CONTENT\" | base64 -d > /root/wheelx-server/\"$file\""
done

echo "Restarting service..."
ssh -o BatchMode=yes -o StrictHostKeyChecking=no root@68.183.89.205 "pm2 restart accountx-api"
echo "Deployment complete."
