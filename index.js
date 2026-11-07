const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();

function requireAuth(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in first.');
  return req.auth.uid;
}
async function requireAdmin(businessId, uid) {
  if (!businessId || typeof businessId !== 'string') throw new HttpsError('invalid-argument', 'Business ID is required.');
  const ref = db.doc(`businesses/${businessId}/members/${uid}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data().active !== true || snap.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only the business Admin can do this.');
  }
}

// Run once for the owner's signed-in account before inviting workers.
// The first claim is race-safe; later callers cannot take ownership.
exports.claimBusiness = onCall(async (req) => {
  const uid = requireAuth(req);
  const businessId = uid;
  const businessRef = db.doc(`businesses/${businessId}`);
  const memberRef = db.doc(`businesses/${businessId}/members/${uid}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(businessRef);
    if (snap.exists) {
      const member = await tx.get(memberRef);
      if (!member.exists || member.data().role !== 'admin') throw new HttpsError('already-exists', 'This account is not the business owner.');
      return;
    }
    tx.create(businessRef, { ownerUid: uid, name: String(req.data?.businessName || 'Smart Business Manager').slice(0,100), createdAt: FieldValue.serverTimestamp() });
    tx.create(memberRef, { uid, role: 'admin', active: true, name: String(req.data?.ownerName || 'Owner').slice(0,80), createdAt: FieldValue.serverTimestamp() });
  });
  await getAuth().setCustomUserClaims(uid, { businessId, role: 'admin' });
  return { businessId, role: 'admin' };
});

exports.createWorker = onCall(async (req) => {
  const adminUid = requireAuth(req);
  const { businessId, email, password, name, role = 'Worker', phone = '' } = req.data || {};
  await requireAdmin(businessId, adminUid);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid worker email address.');
  if (typeof password !== 'string' || password.length < 8) throw new HttpsError('invalid-argument', 'Worker password must be at least 8 characters.');
  if (!name || String(name).trim().length < 2) throw new HttpsError('invalid-argument', 'Worker name is required.');
  let user;
  try { user = await getAuth().createUser({ email: email.trim(), password, displayName: String(name).trim().slice(0,80) }); }
  catch (e) { if (e.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'That email already has an account.'); throw new HttpsError('internal', e.message); }
  try {
    await getAuth().setCustomUserClaims(user.uid, { businessId, role: 'worker' });
    await db.doc(`businesses/${businessId}/members/${user.uid}`).create({ uid: user.uid, email: email.trim(), name: String(name).trim().slice(0,80), jobTitle: String(role).slice(0,80), phone: String(phone).slice(0,30), role: 'worker', active: true, createdBy: adminUid, createdAt: FieldValue.serverTimestamp() });
  } catch (e) {
    await getAuth().deleteUser(user.uid);
    throw new HttpsError('internal', 'Could not create worker membership. No worker account was kept.');
  }
  return { uid: user.uid, email: user.email, name: user.displayName };
});

exports.setStockItem = onCall(async (req) => {
  const uid = requireAuth(req);
  const { businessId, itemId, name, quantity, sellingPrice } = req.data || {};
  await requireAdmin(businessId, uid);
  if (!itemId || !name || !Number.isFinite(Number(quantity)) || Number(quantity) < 0 || !Number.isFinite(Number(sellingPrice)) || Number(sellingPrice) < 0) throw new HttpsError('invalid-argument', 'Check stock details.');
  await db.doc(`businesses/${businessId}/stock/${itemId}`).set({ name: String(name).slice(0,120), quantity: Number(quantity), sellingPrice: Number(sellingPrice), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});

exports.recordSale = onCall(async (req) => {
  const uid = requireAuth(req);
  const { businessId, itemId, quantity, customerName = 'Walk-in', customerPhone = '', customerAddress = '', unitPrice } = req.data || {};
  if (!businessId || !itemId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0) throw new HttpsError('invalid-argument', 'Check sale details.');
  const memberRef = db.doc(`businesses/${businessId}/members/${uid}`);
  const stockRef = db.doc(`businesses/${businessId}/stock/${itemId}`);
  const txRef = db.collection(`businesses/${businessId}/transactions`).doc();
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists || memberSnap.data().active !== true || !['admin','worker'].includes(memberSnap.data().role)) throw new HttpsError('permission-denied', 'You do not have access to this business.');
  const result = await db.runTransaction(async tx => {
    const stockSnap = await tx.get(stockRef);
    if (!stockSnap.exists) throw new HttpsError('not-found', 'Stock item not found.');
    const item = stockSnap.data();
    const qty = Number(quantity);
    if (Number(item.quantity) < qty) throw new HttpsError('failed-precondition', 'Not enough stock. Available: ' + item.quantity);
    const price = Number(unitPrice);
    const total = qty * price;
    tx.update(stockRef, { quantity: Number(item.quantity) - qty, updatedAt: FieldValue.serverTimestamp() });
    tx.create(txRef, { type: 'sale', itemId, itemName: item.name, quantity: qty, unitPrice: price, total, customerName: String(customerName).slice(0,100), customerPhone: String(customerPhone).slice(0,30), customerAddress: String(customerAddress).slice(0,160), workerUid: uid, workerName: memberSnap.data().name || 'Worker', createdAt: FieldValue.serverTimestamp(), date: new Date().toISOString().slice(0,10) });
    return { transactionId: txRef.id, itemName: item.name, quantity: qty, unitPrice: price, total, remaining: Number(item.quantity) - qty };
  });
  return result;
});

exports.recordService = onCall(async (req) => {
  const uid = requireAuth(req);
  const { businessId, serviceName, description = '', quantity = 1, unitPrice, customerName = 'Walk-in', customerPhone = '', customerAddress = '' } = req.data || {};
  if (!businessId || !serviceName || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0) throw new HttpsError('invalid-argument', 'Check service details.');
  const member = await db.doc(`businesses/${businessId}/members/${uid}`).get();
  if (!member.exists || member.data().active !== true) throw new HttpsError('permission-denied', 'You do not have access to this business.');
  const ref = db.collection(`businesses/${businessId}/transactions`).doc();
  const total = Number(quantity) * Number(unitPrice);
  await ref.create({ type: 'service', serviceName: String(serviceName).slice(0,120), description: String(description).slice(0,500), quantity: Number(quantity), unitPrice: Number(unitPrice), total, customerName: String(customerName).slice(0,100), customerPhone: String(customerPhone).slice(0,30), customerAddress: String(customerAddress).slice(0,160), workerUid: uid, workerName: member.data().name || 'Worker', createdAt: FieldValue.serverTimestamp(), date: new Date().toISOString().slice(0,10) });
  return { transactionId: ref.id, total };
});
exports.setStockCost = onCall(async (req) => {
  const uid = requireAuth(req);
  const { businessId, itemId, costPrice } = req.data || {};

  await requireAdmin(businessId, uid);

  if (
    !itemId ||
    !Number.isFinite(Number(costPrice)) ||
    Number(costPrice) < 0
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Enter a valid stock cost price.'
    );
  }

  const stockRef = db.doc(
    `businesses/${businessId}/stock/${itemId}`
  );

  const stockSnap = await stockRef.get();

  if (!stockSnap.exists) {
    throw new HttpsError('not-found', 'Stock item not found.');
  }

  await db.doc(
    `businesses/${businessId}/private/stockCosts/${itemId}`
  ).set({
    itemId,
    costPrice: Number(costPrice),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ok: true };
});
exports.recordExpense = onCall(async (req) => {
  const uid = requireAuth(req);
  const {
    businessId,
    description,
    category = 'General',
    amount,
    date
  } = req.data || {};

  await requireAdmin(businessId, uid);

  if (
    !description ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Enter a description and a valid expense amount.'
    );
  }

  const expenseRef = db.collection(
    `businesses/${businessId}/private/expenses`
  ).doc();

  await expenseRef.set({
    description: String(description).slice(0, 150),
    category: String(category).slice(0, 80),
    amount: Number(amount),
    date: date || new Date().toISOString().slice(0, 10),
    recordedBy: uid,
    createdAt: FieldValue.serverTimestamp()
  });

  return {
    ok: true,
    expenseId: expenseRef.id
  };
});
