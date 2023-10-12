import { jest } from "@jest/globals";
import mongoose, { createConnection } from "mongoose";

const fn = createConnection;
export default () => {
    jest.spyOn(mongoose, "createConnection").mockImplementation(() => {
        return fn("test");
    });
};
