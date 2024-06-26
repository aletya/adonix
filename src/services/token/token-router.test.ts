import { describe, expect, it } from "@jest/globals";
import { StatusCode } from "status-code-enum";
import { postAsAttendee } from "../../testTools.js";
import { generateRandomString } from "./token-router-lib.js";


describe("POST /token/encode + /token/decode", () => {
    it("works for random user data", async () => {
        const randomName = generateRandomString(10);
        const encrypted = await postAsAttendee(`/token/encode`)
            .send({ name: randomName })
            .expect(StatusCode.SuccessOK);
        const encryptedJSON : string = JSON.parse(encrypted.text);
        const decrypted = await postAsAttendee(`/token/decode`)
            .send(encryptedJSON)
            .expect(StatusCode.SuccessOK);
        expect(JSON.parse(decrypted.text)).toHaveProperty("name", randomName);
    });
});

describe("POST /token/decode", () => {
    it("returns MissingParams for missing parameters", async () => {
        const response1 = await postAsAttendee(`/token/decode`)
            .send({ })
            .expect(StatusCode.ClientErrorBadRequest);
        expect(JSON.parse(response1.text)).toHaveProperty("error", "MissingParams");
        
        const response2 = await postAsAttendee(`/token/decode`)
            .send({ token: "meh" })
            .expect(StatusCode.ClientErrorBadRequest);
        expect(JSON.parse(response2.text)).toHaveProperty("error", "MissingParams");

        
        const response3 = await postAsAttendee(`/token/decode`)
            .send({ context: "meh" })
            .expect(StatusCode.ClientErrorBadRequest);
        expect(JSON.parse(response3.text)).toHaveProperty("error", "MissingParams");
    });

    it("returns InvalidParams for invalid token", async () => {
        const response = await postAsAttendee(`/token/decode`)
            .send({ token: "asdf", context: "potato"})
            .expect(StatusCode.ClientErrorBadRequest);
        expect(JSON.parse(response.text)).toHaveProperty("error", "InvalidParams");
    });

    it("returns Unauthorized for invalid signature", async () => {
        //this decrypts to { name: "Aydan Pirani"}, but has an invalid signature
        const precomputedToken = {
            token: "DDdZWHSAMhZYTP3R+05Hnp4VeQPmEpyAFkJKLkYdoE9085icTVy7EX2mud7wbEFp+aaNyrskrRUP1ovMTtG7o+3MjAU8caBPHGBPWBblgsU=",
            context: "0945a4089579908e4e587265ccf4a52d"
        }
        
        const response = await postAsAttendee(`/token/decode`)
            .send( precomputedToken )
            .expect(StatusCode.ClientErrorBadRequest);
        expect(JSON.parse(response.text)).toHaveProperty("error", "Unauthorized");
    });
});