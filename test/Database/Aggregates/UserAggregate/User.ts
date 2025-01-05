import { uuidv7 } from '@/bunet/core'
import { DataTypes, Model, Sequelize, type Optional } from 'sequelize'

export interface IUser {
  id: string
  name: string
  userName: string
  password: string
}

export interface IUserCreationAttributes extends Optional<IUser, 'id'> {
}

export class UserModel extends Model<IUser, IUserCreationAttributes> {
  static Definition(sequelize: Sequelize, modelName: string, tableName: string): typeof UserModel {
    UserModel.init(
      {
        id: {
          type: DataTypes.STRING(32),
          defaultValue: (): string => {
            return uuidv7(true)
          },
          primaryKey: true
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
        modelName,
        tableName,
        timestamps: true,
        hooks: {
          beforeCreate: (user) => {
            console.log(`Creating user`, user.get({ plain: true }))
          },
          afterCreate: (user) => {
            console.log(`User created`)
          }
        }
      }
    )
    return UserModel
  }
}
