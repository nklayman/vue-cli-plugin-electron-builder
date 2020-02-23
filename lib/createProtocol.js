import { app,protocol } from "electron";

import * as path from "path";
import { open } from "fs";
import { URL } from "url";


/**
 * @param scheme
 */
export default scheme => {
  protocol.registerFileProtocol(
    scheme,
    (request, respond) => {
      const url = new URL(request.url);

      let pathName = url.pathname;
      pathName = decodeURI(pathName); // Needed in case URL contains spaces

      let truePath;

      switch (pathName) {
        case "":
        case "/":
        case "/index":
        case "/index.heml":
          truePath = path.join(app.getAppPath(), "index.html");
          break;
        default:
          truePath = path.join(app.getAppPath(), pathName);
          break;
      }

      // try load
      open(truePath, "r", 0o666, err => {
        if (err) {
          truePath = path.join(app.getAppPath(), "index.html");
          console.log("open fail, fallback to /index.html, ", truePath);
        }

        respond(truePath);
      });
    },
    error => {
      if (error) {
        console.error(`Failed to register ${scheme} protocol`, error);
      }
    }
  );
};
