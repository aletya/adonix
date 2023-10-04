import mongoose from "mongoose";
import { User } from "./user-models.js";
import { getModelForClass } from "@typegoose/typegoose";
import { generateConfig } from "src/database";
import Constants from "src/constants";

// Collections within the user database
export enum UserDB {
	INFO = "users",
}


export const UserModel: mongoose.Model<User> = getModelForClass(User, generateConfig(Constants.USER_DB, UserDB.INFO));
