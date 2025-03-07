#!/usr/bin/env node

const ynab = require('ynab');
const { hideBin } = require('yargs/helpers');
const yargs = require('yargs/yargs');
require('dotenv').config();

const accessToken = process.env.YNAB_TOKEN;
const ynabAPI = new ynab.API(accessToken);

function format_key(key) {
    return `\x1b[1m${key}\x1b[22m`;
}

yargs(hideBin(process.argv))
  .command({
    command: 'get <command>',
    builder: (yargs) => yargs
      .command({
        command: 'budgets',
        describe: 'List all available budgets',
        handler: listBudgets
      })
      .command({
        command: 'accounts <budget>',
        describe: 'List accounts for a budget',
        handler: listAccounts
      })
      .command({
        command: 'transactions <budget>',
        describe: 'List transactions for a budget',
        builder: (yargs) => yargs
          .option('account', { describe: 'Filter by account name', type: 'string' })
          .option('start', { 
            describe: 'Start date (YYYY-MM-DD)', 
            type: 'string',
            default: () => {
                const date = new Date();
                date.setDate(date.getDate() - 30); 
                return date.toISOString();
            } 
          })
          .option('end', { 
            describe: 'End date (YYYY-MM-DD)', 
            type: 'string',
            default: () => {
              return new Date().toISOString();
            }
          }),
        handler: listTransactions
      })
      .demandCommand(),
    handler: () => {}
  })
  .command({
    command: 'add transactions <budget> <account>',
    describe: 'Add a transaction with splits',
    builder: (yargs) => yargs
      .option('date', { 
        describe: 'Transaction date (YYYY-MM-DD)', 
        type: 'string', 
        default: new Date().toISOString()
      })
      .option('payee', { 
        describe: 'Payee name for the split', 
        type: 'string', 
        array: true 
      })
      .option('category', { 
        describe: 'Category name for the split', 
        type: 'string', 
        array: true, 
        demandOption: true 
      })
      .option('outflow', { 
        describe: 'Outflow amount', 
        type: 'number', 
        array: true 
      })
      .option('inflow', { 
        describe: 'Inflow amount', 
        type: 'number', 
        array: true 
      })
      .check(argv => validateTransactionArgs(argv)),
    handler: addTransaction
  })
  .demandCommand()
  .help()
  .parse();

// Handlers
async function listBudgets() {
  try {
    const budgetsResponse = await ynabAPI.budgets.getBudgets();
    const budgets = budgetsResponse.data.budgets;
    console.log(format_key('BUDGETS'));
    budgets.forEach(budget => console.log(budget.name));
  } catch (err) {
    console.error('Error fetching budgets:', err);
    process.exit(1);
  }
}

async function listAccounts(argv) {
  try {
    const { budget } = argv;
    const budgetsResponse = await ynabAPI.budgets.getBudgets();
    const budgetObj = budgetsResponse.data.budgets.find(b => b.name === budget);
    if (!budgetObj) throw new Error(`Budget "${budget}" not found`);
    
    const accountsResponse = await ynabAPI.accounts.getAccounts(budgetObj.id);
    console.log(format_key('ACCOUNTS'));
    accountsResponse.data.accounts.forEach(acc => console.log(acc.name));
  } catch (err) {
    console.error('Error fetching accounts:', err);
    process.exit(1);
  }
}

async function listTransactions(argv) {
  try {
    const { budget, account, start, end } = argv;
    const budgetsResponse = await ynabAPI.budgets.getBudgets();
    const budgetObj = budgetsResponse.data.budgets.find(b => b.name === budget);
    if (!budgetObj) throw new Error(`Budget "${budget}" not found`);

    let accountId = null;
    if (account) {
      const accountsResponse = await ynabAPI.accounts.getAccounts(budgetObj.id);
      const accountObj = accountsResponse.data.accounts.find(a => a.name === account);
      if (!accountObj) throw new Error(`Account "${account}" not found`);
      accountId = accountObj.id;
    }

    console.log(start);
    const transactionsResponse = await ynabAPI.transactions.getTransactions(budgetObj.id, accountId, start);
    const transactions = transactionsResponse.data.transactions.filter(t => {
      const tDate = new Date(t.date);
      const endDate = new Date(end);
      return tDate <= endDate;
    });

    console.log(format_key('TRANSACTIONS'));
    transactions.forEach(t => {
      const amount = t.amount / 1000;
      console.log(`- Date: ${t.date}, Payee: ${t.payee_name}, Amount: ${amount}, Account: ${t.account_name}`);
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    process.exit(1);
  }
}

function validateTransactionArgs(argv) {
  const { category, payee } = argv;
  if (!category || category.length === 0) throw new Error('At least one category is required');
  if (!payee || payee.length === 0) throw new Error('First split requires a --payee');
  
  for (let i = 0; i < category.length; i++) {
    const hasOutflow = argv.outflow && i < argv.outflow.length;
    const hasInflow = argv.inflow && i < argv.inflow.length;
    if (!hasOutflow && !hasInflow) throw new Error(`Split ${i + 1} requires --outflow or --inflow`);
  }
  return true;
}

async function addTransaction(argv) {
  try {
    const { budget, account, date, payee, category, outflow, inflow } = argv;
    // ... rest of the addTransaction implementation from previous version ...
  } catch (err) {
    console.error('Error adding transaction:', err);
    process.exit(1);
  }
}
