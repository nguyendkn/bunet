import { type Options, Sequelize, Transaction } from 'sequelize'

export class DbContext {
  protected sequelize: Sequelize

  constructor(options: Options) {
    this.sequelize = new Sequelize(options)
    this.OnModelCreating(this.sequelize)
  }

  /**
   * Configures the DbContext by passing the derived class as a constructor argument.
   * @param instance - The derived class constructor.
   * @param options - Options for Sequelize initialization.
   * @returns A new instance of the derived DbContext class.
   */
  static OnConfiguring<T extends DbContext>(
    instance: new (options: Options) => T,
    options: Options
  ): T {
    return new instance(options); // Tạo instance từ class được truyền vào
  }


  // Hook for setting up models (to be overridden in derived classes)
  protected OnModelCreating(sequelize: Sequelize): void {
    throw new Error('OnModelCreating method must be implemented.')
  }

  // Synchronize the database
  public async Sync(): Promise<void> {
    await this.sequelize.sync({ alter: true })
  }

  // Get the Sequelize instance
  public GetSequelize(): Sequelize {
    return this.sequelize
  }

  /**
   * Starts a new transaction.
   * @returns A new Sequelize transaction object.
   */
  public async BeginTransaction(): Promise<Transaction> {
    return await this.sequelize.transaction()
  }

  /**
   * Runs a callback function within a transaction context.
   * Automatically commits or rolls back based on the success or failure of the callback.
   * @param callback A function to run within the transaction.
   */
  public async RunInTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    const transaction = await this.BeginTransaction()
    try {
      const result = await callback(transaction)
      await transaction.commit() // Commit if successful
      return result
    } catch (error) {
      await transaction.rollback() // Rollback if an error occurs
      throw error
    }
  }
}
