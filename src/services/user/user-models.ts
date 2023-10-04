import { prop } from "@typegoose/typegoose";
import { UserFormat } from "./user-formats";

// User object document schema
export class User {
	@prop({ required: true })
		_id: string;
	
	@prop({ required: true })
		userId: string;
	
	@prop({ required: true })
		firstName: string;
	
	@prop({ required: true })
		lastName: string;

	@prop({ required: true })
		username: string;

	@prop({ required: true })
		email: string;

	constructor(userFormat: UserFormat) {
		this._id = userFormat.id;
		this.userId = userFormat.id;
		this.email = userFormat.email;
		this.firstName = userFormat.firstname;
		this.lastName = userFormat.lastname;
		this.username = userFormat.username;
	}
}

// User object document schema
export class FilteredUserView {
	id: string;
	username: string;
	firstname: string;
	lastname: string;
	email: string;
}
