#!/usr/bin/env node

const ynab = require('ynab');
const argv = require('yargs').argv;
require('dotenv').config();

const accessToken = process.env.YNAB_TOKEN;
const ynabAPI = new ynab.API(accessToken);

(async function () {
  try {
    const budgetName = argv.budget;
    const receipt = JSON.parse(argv.receipt);

    const payeeName = receipt.name;
    const paymentMethod = receipt.payment_method;
    const total = receipt.total;
    const items = receipt.items;

    const budgetsResponse = await ynabAPI.budgets.getBudgets();
    const budget = budgetsResponse.data.budgets.find((budget) => budget.name === budgetName);

    const accountsResponse = await ynabAPI.accounts.getAccounts(budget.id);
    const account = accountsResponse.data.accounts.find((account) => account.name === accountName);

    const payeesResponse = await ynabAPI.payees.getPayees(budget.id);
    const payee = payeesResponse.data.payees.find((payee) => payee.name === payeeName);
    
    const subtransactions = []

    if (items) {
      const categoriesResponse = await ynabAPI.categories.getCategories(budget.id);
      const groups = categoriesResponse.data.category_groups;
      for (let group of groups) {
        for (let category of group.categories) {
          if (category.name) {
            name = category.name.trim().toLowerCase();
            for (let item of items) {
              if (name.startsWith(item.category.trim().toLowerCase())) {
                for (let sub of subtransactions) {
                  if (sub.category_id === category.id) {
                    // add amount to existing subtransaction
                    sub.amount += item.amount * 1000;
                    break;
                  }
                }
                // add category to subtransactions
                subtransactions.push({
                  amount: item.amount * 1000,
                  category_id: category.id,
                });
                break;
              }
            }
          }
        }
      }
    }

    for (let sub of subtransactions) {
      // negate amounts
      if (sub.amount > 0) {
        sub.amount *= -1;
      }
    }

    const transaction = {
      account_id: account.id,
      date: ynab.utils.convertFromISODateString(date),
      amount: total * -1000,
      payee_id: payee.id,
      cleared: 'uncleared',
      approved: false,
      subtransactions: subtransactions,
    };

    await ynabAPI.transactions.createTransaction(budget.id, {transaction});
  } catch (err) {
    console.log(err);
    process.exitCode = 1;
  }
})();
