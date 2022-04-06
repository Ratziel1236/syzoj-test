import * as TypeORM from "typeorm";
import Model from "./common";

@TypeORM.Entity()
export default class ProblemList extends Model {
  static cache = true;

  @TypeORM.PrimaryGeneratedColumn()
  id: number;

  @TypeORM.Column({ nullable: true, type: "varchar", length: 80 })
  title: string;

  @TypeORM.Column({ nullable: true, type: "text" })
  description: string;

  @TypeORM.Column({ nullable: true, type: "text" })
  information: string;

  @TypeORM.Column({ nullable: true, type: "text" })
  problems: string;

  @TypeORM.Column({ nullable: true, type: "integer" })
  owner_id: number;

  @TypeORM.Column({ nullable: true, type: "boolean" })
  is_public: boolean;

  async isAllowedEditBy(user) {
    return user && (user.is_admin || await user.hasPrivilege('manage_problem') || user.id == this.owner_id);
  }

  async isAllowedUseBy(user) {
    return this.is_public || (user && (user.is_admin || await user.hasPrivilege('manage_problem') || user.id == this.owner_id));
  }
}
