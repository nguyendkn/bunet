import { uuidv7 } from '@/bunet/core'
import { DataTypes, Model, Sequelize, type ModelStatic, type Optional } from 'sequelize'

export interface IUser {
  id: string
  name: string
  userName: string
  password: string
}

export interface IUserCreationAttributes extends Optional<IUser, 'id'> {}

export class UserModel extends Model<IUser, IUserCreationAttributes> implements IUser {
  public id!: string
  public name!: string
  public userName!: string
  public password!: string

  static Definition(sequelize: Sequelize, modelName: string): ModelStatic<UserModel> {
    return UserModel.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: (): string => uuidv7()
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        userName: {
          type: DataTypes.STRING,
          allowNull: false
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName
      }
    ) as ModelStatic<UserModel>
  }
}
