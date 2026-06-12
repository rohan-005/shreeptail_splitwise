import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Group from './models/Group.js';
import GroupMember from './models/GroupMember.js';
import Expense from './models/Expense.js';
import Settlement from './models/Settlement.js';
import Comment from './models/Comment.js';
import { calculateGroupBalances } from './services/balanceService.js';

dotenv.config();

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    // 1. Clear database
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Group.deleteMany({});
    await GroupMember.deleteMany({});
    await Expense.deleteMany({});
    await Settlement.deleteMany({});
    await Comment.deleteMany({});
    console.log('Database cleared.');

    // 2. Create users
    console.log('Creating mock users...');
    const alice = await User.create({
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'password123',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alice',
    });
    const bob = await User.create({
      name: 'Bob Jones',
      email: 'bob@example.com',
      password: 'password123',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bob',
    });
    const charlie = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: 'password123',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Charlie',
    });
    console.log(`Users created: ${alice.name}, ${bob.name}, ${charlie.name}`);

    // 3. Create group
    console.log('Creating group...');
    const group = await Group.create({
      name: 'Goa Trip 2026',
      category: 'trip',
      createdBy: alice._id,
    });
    console.log(`Group created: ${group.name}`);

    // 4. Add members
    console.log('Adding members to group...');
    await GroupMember.create([
      { groupId: group._id, userId: alice._id, role: 'creator' },
      { groupId: group._id, userId: bob._id, role: 'member' },
      { groupId: group._id, userId: charlie._id, role: 'member' },
    ]);
    console.log('Members added successfully.');

    // 5. Create expenses
    console.log('Creating expenses...');
    // Expense 1: Alice paid ₹3000 for Cab. Equally split among Alice, Bob, Charlie (1000 each)
    const exp1 = await Expense.create({
      description: 'Cab to airport',
      amount: 3000,
      paidBy: alice._id,
      splitType: 'equal',
      groupId: group._id,
      splits: [
        { user: alice._id, amount: 1000 },
        { user: bob._id, amount: 1000 },
        { user: charlie._id, amount: 1000 },
      ],
      createdBy: alice._id,
    });

    // Expense 2: Bob paid ₹1500 for Breakfast. Equally split among Alice, Bob, Charlie (500 each)
    const exp2 = await Expense.create({
      description: 'Breakfast',
      amount: 1500,
      paidBy: bob._id,
      splitType: 'equal',
      groupId: group._id,
      splits: [
        { user: alice._id, amount: 500 },
        { user: bob._id, amount: 500 },
        { user: charlie._id, amount: 500 },
      ],
      createdBy: bob._id,
    });

    // Expense 3: Charlie paid ₹900 for drinks. Split equally only between Bob and Charlie (450 each, Alice owes 0)
    const exp3 = await Expense.create({
      description: 'Beach Drinks',
      amount: 900,
      paidBy: charlie._id,
      splitType: 'equal',
      groupId: group._id,
      splits: [
        { user: bob._id, amount: 450 },
        { user: charlie._id, amount: 450 },
      ],
      createdBy: charlie._id,
    });

    console.log('Expenses logged.');

    // 6. Calculate initial balances
    let balances = await calculateGroupBalances(group._id);
    console.log('\n--- Initial Balances ---');
    console.log('Net Balances (Total Paid - Total Owed):');
    balances.netBalances.forEach((nb) => {
      console.log(`  ${nb.user.name}: ₹${nb.netBalance.toFixed(2)}`);
    });
    console.log('Simplified Debts (Ower owes Owee):');
    balances.debts.forEach((d) => {
      console.log(`  ${d.fromUser.name} owes ${d.toUser.name}: ₹${d.amount.toFixed(2)}`);
    });

    // 7. Record a settlement (Bob pays Alice ₹500)
    console.log('\nRecording settlement: Bob pays Alice ₹500...');
    await Settlement.create({
      fromUser: bob._id,
      toUser: alice._id,
      groupId: group._id,
      amount: 500,
    });

    // 8. Re-calculate balances
    balances = await calculateGroupBalances(group._id);
    console.log('\n--- Balances After Settlement ---');
    console.log('Net Balances:');
    balances.netBalances.forEach((nb) => {
      console.log(`  ${nb.user.name}: ₹${nb.netBalance.toFixed(2)}`);
    });
    console.log('Simplified Debts:');
    balances.debts.forEach((d) => {
      console.log(`  ${d.fromUser.name} owes ${d.toUser.name}: ₹${d.amount.toFixed(2)}`);
    });

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
  }
};

seed();
