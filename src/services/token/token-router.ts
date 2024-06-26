import { Request, Response, Router } from "express";
import { StatusCode } from "status-code-enum";
import Config from "../../config.js";
import { RouterError } from "../../middleware/error-handler.js";
import { NextFunction } from "express-serve-static-core";
import * as crypto from 'crypto';

const tokenRouter : Router = Router();

/**
 * @api {post} /token/encode/ POST /token/encode/
 * @apiGroup token
 * @apiDescription Get a signed, encrypted token along with the context needed to decrypt it.
 * 
 * @apiSuccess (200: Success) {String} The signed, encrypted token.
 * @apiSuccess (200: Success) {String} The context needed to decrypt the token.

 * @apiSuccessExample Example Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *      "token": "YgilbTLUmdtz5X7AYW0pXzwykE2PxlvyQRhg6vzRbDXmKhpZ+kfwVH5TYMEM6n7NOjS1GyqgM2bKxFDBxOt81CMHelw+yQfFB+ObXWeG2sAKIVxxNxHclNX8S62XG9dN",
 *      "context": "91ab24590b32603f80c3472d4d3ffef6"
 *  }
 */
tokenRouter.post("/encode", (req: Request, res: Response) => {
    //HackWebTokens
    const encoded = btoa(JSON.stringify(req.body));
    const hmac = crypto.createHmac('sha256', Config.SECRET_SIGNATURE_KEY);
    const data = Buffer.from(encoded, 'base64');
    hmac.update(data);
    const signature = hmac.digest('base64');
    const token = encoded + '.' + signature;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(Config.SECRET_ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(token);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const encryptedString = encrypted.toString('base64');
    const ivString = iv.toString('hex');

    return res.status(StatusCode.SuccessOK).send({ token: encryptedString, context: ivString });
});


/**
 * @api {post} /token/decode/ POST /token/decode/
 * @apiGroup token
 * @apiDescription Decode a signed, encrypted token using the provided context.
 * 
 * @apiParam {String} token The signed, encrypted token that needs to be decoded.
 * @apiParam {String} context The context required to decrypt the token.

 * @apiSuccessExample Example Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *      "token": "YgilbTLUmdtz5X7AYW0pXzwykE2PxlvyQRhg6vzRbDXmKhpZ+kfwVH5TYMEM6n7NOjS1GyqgM2bKxFDBxOt81CMHelw+yQfFB+ObXWeG2sAKIVxxNxHclNX8S62XG9dN",
 *      "context": "91ab24590b32603f80c3472d4d3ffef6"
 *  }
 * 
 * @apiError (400: Bad Request) {String} MissingParams Missing parameters.
 * @apiError (400: Bad Request) {String} InvalidParams Invalid parameters.
 * @apiError (401: Unauthorized) {string} Unauthorized Invalid token (not API-signed).
 * @apiErrorExample Example Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {"error": "InvalidParams"}
 * @apiErrorExample Example Error Response:
 *     HTTP/1.1 401 Unauthorized
 *     {"error": "Unauthorized"}
 */
tokenRouter.post("/decode", (req: Request, res: Response, next: NextFunction) => {
    if(!req.body.token || !req.body.context) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "MissingParams"));
    }
    const encryptedString = req.body.token;
    const ivString = req.body.context;

    try {
        const encrypted = Buffer.from(encryptedString, 'base64');
        const iv = Buffer.from(ivString, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(Config.SECRET_ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const token = decrypted.toString().split('.');
        const encoded = token[0];
        const signature = token[1];

        if(!encoded) {
            return next(new RouterError(StatusCode.ClientErrorBadRequest, "InvalidParams"));
        }

        const hmac = crypto.createHmac('sha256', Config.SECRET_SIGNATURE_KEY);
        const data = Buffer.from(encoded, 'base64');
        hmac.update(data);
        const calculatedSignature = hmac.digest('base64');
        if(signature != calculatedSignature) {
            return next(new RouterError(StatusCode.ClientErrorBadRequest, "Unauthorized"));
        }

        const decoded = JSON.parse(atob(encoded));
        return res.status(StatusCode.SuccessOK).send( decoded );
    } catch(error) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "InvalidParams"));
    }
});


export default tokenRouter;