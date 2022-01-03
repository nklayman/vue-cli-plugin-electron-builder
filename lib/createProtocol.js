/*
  Slightly modified from:

  Reasonably Secure Electron
  Copyright (C) 2019  Bishop Fox
  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU General Public License
  as published by the Free Software Foundation; either version 2
  of the License, or (at your option) any later version.
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
-------------------------------------------------------------------------
Implementing a custom protocol achieves two goals:
  1) Allows us to use ES6 modules/targets for Angular
  2) Avoids running the app in a file:// origin
*/

import { protocol } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { URL } from 'url'

const mimeTypes = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'application/svg+xml',
  '.ico': 'image/vnd.microsoft.icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.map': 'text/plain'
}

function charset (mimeType) {
  return ['.html', '.htm', '.js', '.mjs'].some((m) => m === mimeType)
    ? 'utf-8'
    : null
}

function mime (filename) {
  const type = mimeTypes[path.extname(`${filename || ''}`).toLowerCase()]
  return type || null
}

export default (scheme, customProtocol) =>
  (customProtocol || protocol).registerBufferProtocol(scheme, (req, next) => {
    const reqUrl = new URL(req.url)

    // If the path doesn't start with "/" then path.normalize will not
    // resolve all '..' and could lead to path traversal attacks
    if (!reqUrl.pathname.startsWith('/')) {
      return next({
        mimeType: null,
        charset: null,
        data: null
      })
    }

    let reqPath = path.normalize(reqUrl.pathname)
    if (reqPath === '/') {
      reqPath = '/index.html'
    }

    const reqFilename = path.basename(reqPath)
    fs.readFile(path.join(__dirname, reqPath), (err, data) => {
      const mimeType = mime(reqFilename)
      if (!err && mimeType !== null) {
        next({
          mimeType: mimeType,
          charset: charset(mimeType),
          data: data
        })
      } else {
        console.error(err)
        next({
          mimeType: null,
          charset: null,
          data: null
        })
      }
    })
  })
