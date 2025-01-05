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
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
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
            console.log(`Creating user`)
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
