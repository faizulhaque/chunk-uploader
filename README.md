# Large file uploader

- Description

We usually need to upload file from frontend (Javascript / Mobile) to any file storage system like s3 via backend.

We used to post the complete file in single post call which either hangup or takes time on the browser or mobile app.

This repo contains the POC of uploading large file in chunk using following techstack.

1. NodeJS
2. HTML + jQuery + Vanila Javascript (Frontend)
3. AWS S3 (for file Storage)


- How to Use it

  - clone it
  - npm install
  - DEBUG=chunk-uploader:* npm run watch or just npm start

