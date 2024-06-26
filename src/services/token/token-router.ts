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
 * @apiDescription Get a QR code with a pre-defined expiration for the user provided in the JWT token. Since expiry is set to 20 seconds,
 * we recommend that the results from this endpoint are not stored, but instead used immediately.
 * 
 * TODO: Rename back from /v2-qr/ to /qr/
 *
 * @apiSuccess (200: Success) {String} userId User to generate a QR code for
 * @apiSuccess (200: Success) {String} qrInfo Stringified QR code for the given user

 * @apiSuccessExample Example Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *      "userId": "provider000001",
 *      "qrinfo": "hackillinois://user?userToken=loremipsumdolorsitamet"
 *  }
 *
 * @apiUse strongVerifyErrors
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

tokenRouter.post("/decode", (req: Request, res: Response, next: NextFunction) => {
    if(!req.body.token || !req.body.context) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "Missing Params"));
    }
    const encryptedString = req.body.token;
    const ivString = req.body.context;

    const encrypted = Buffer.from(encryptedString, 'base64');
    const iv = Buffer.from(ivString, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(Config.SECRET_ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const token = decrypted.toString().split('.');
    const encoded = token[0];
    const signature = token[1];
    if(!encoded || !signature) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "Invalid Token"));
    }
    const hmac = crypto.createHmac('sha256', Config.SECRET_SIGNATURE_KEY);
    const data = Buffer.from(encoded, 'base64');
    hmac.update(data);
    const calculatedSignature = hmac.digest('base64');
    if(signature != calculatedSignature) {
        return next(new RouterError(StatusCode.ClientErrorBadRequest, "Invalid Signature"));
    }

    const decoded = JSON.parse(atob(encoded));
    return res.status(StatusCode.SuccessOK).send( decoded );
});


export default tokenRouter;