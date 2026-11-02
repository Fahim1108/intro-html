'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const multer = require('multer');
const config = require('./config');

class UploadError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1,
    fields: 20,
  },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new UploadError('Cover images must be JPG, PNG or WebP.'));
    }
    return callback(null, true);
  },
});

const coverUpload = upload.single('cover');

function imageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: 'png', mime: 'image/png' };
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { extension: 'webp', mime: 'image/webp' };
  }
  return null;
}

async function saveProjectCover(file) {
  if (!file || !file.buffer) return null;
  if (file.size > config.maxUploadBytes) {
    throw new UploadError('Cover images must be 5 MB or smaller.');
  }
  const detected = imageType(file.buffer);
  if (!detected) throw new UploadError('That file is not a valid JPG, PNG or WebP image.');

  await fs.mkdir(config.uploadDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${detected.extension}`;
  const filePath = path.join(config.uploadDir, filename);
  await fs.writeFile(filePath, file.buffer, { flag: 'wx' });
  return `/uploads/projects/${filename}`;
}

async function removeProjectCover(publicPath) {
  if (!publicPath || typeof publicPath !== 'string') return;
  const prefix = '/uploads/projects/';
  if (!publicPath.startsWith(prefix)) return;
  const filename = path.basename(publicPath);
  const filePath = path.resolve(config.uploadDir, filename);
  const expectedRoot = path.resolve(config.uploadDir) + path.sep;
  if (!filePath.startsWith(expectedRoot)) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('[upload] Could not remove cover:', error.message);
  }
}

module.exports = {
  coverUpload,
  saveProjectCover,
  removeProjectCover,
  UploadError,
  upload,
};
