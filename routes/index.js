var express = require('express');
var router = express.Router();

var AWS = require('aws-sdk');
var s3 = new AWS.S3({
  region: 'region',
  accessKeyId: 'accessKeyId',
  secretAccessKey: 'secretAccessKey'
});
var bucket = 'bucket'; // AWS S3 Bucket Name
var minLimit = 5 * 1024 * 1024; // 5MB Minimum limit of AWS S3 for chunk upload

/**
 * Rendering html page the first one
 */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/**
 * Main and one and only route which will handle the upload request.
 */
router.post('/u', function (req, res, next) {
  console.log("hit:s", req.body.data.fileName, req.body.data.fileType);
  // Perform all the validations here

  //actual process
  if (!req.body.data.partNum) { // checking if it's first chunk
    // if first chunk is less than 5MB means it's all the data what front-end have
    if (req.body.data.totalSize <= minLimit) {
      s3.putObject({
        Bucket: bucket,
        Key: getFileName(req.body.data),
        Body: req.body.data.content
      }, function (resp) {
        res.json(resp);
      });
    } else {
      initialUpload(req.body.data, function (data) {
        res.json(data);
      });
    }
  } else { // next chunk received
    req.body.data.partNum = +req.body.data.partNum + 1;
    uploadFile(req.body.data, function (data) {
      res.json(data);
    });
  }
});

/**
 * Creating Name file by just appending epoch to make it unique every time
 * @param {String} data 
 */
function getFileName(data) {
  return '/' + new Date().getTime() + '-' + data.fileName;
}

/**
 * Initial Uplaod handler
 * @param {Object of Chunk} data 
 * @param {Response} callback 
 */
function initialUpload(data, callback) {
  var key = getFileName(data);
  var multiPartParams = {
    Bucket: bucket,
    Key: key,
    ContentType: data.fileType
  };
  s3.createMultipartUpload(multiPartParams, function (mpErr, multipart) {
    if (mpErr) { console.log('Error!', mpErr); return; }
    console.log("Got upload ID", multipart.UploadId);
    var partParams = {
      content: data.content,
      key: key,
      partNum: 1,
      uploadId: multipart.UploadId,
      parts: [],
      totalSize: data.totalSize,
      fileName: data.fileName,
      fileType: data.fileType
    };
    uploadFile(partParams, callback);
  });
}

/**
 * Subsequent upload chunk handler
 * @param {Chunk Object} data 
 * @param {Response} callback 
 */
function uploadFile(data, callback) {
  var partParams = {
    Body: data.content,
    Bucket: bucket,
    Key: data.key,
    PartNumber: data.partNum + '',
    UploadId: data.uploadId
  };
  s3.uploadPart(partParams, function (multiErr, mData) {
    if (multiErr) { console.log('Error!', multiErr); return; }
    data.parts[+data.partNum - 1] = {
      ETag: mData.ETag,
      PartNumber: data.partNum + ''
    };
    data.content = null;
    var steps = Math.ceil(data.totalSize / minLimit);
    if (steps === +data.partNum) {
      var doneParams = {
        Bucket: bucket,
        Key: data.key,
        MultipartUpload: { Parts: data.parts },
        UploadId: data.uploadId
      };
      s3.completeMultipartUpload(doneParams, function (err, data) {
        if (err) { console.log('Error!', err); return; }
        callback(data);
      });
    } else {
      callback(data);
    }
  });
}

module.exports = router;
