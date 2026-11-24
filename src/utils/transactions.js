const mongoose = require('mongoose');

let cached;

/**
 * MongoDB only allows multi-document transactions on a replica set / sharded cluster.
 * USE_TRANSACTIONS=true|false forces the behaviour; otherwise it is detected once.
 */
exports.supportsTransactions = async () => {
  const flag = process.env.USE_TRANSACTIONS;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  if (cached === undefined) {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    cached = Boolean(hello.setName || hello.msg === 'isdbgrid');
  }
  return cached;
};

exports.resetTransactionDetection = () => {
  cached = undefined;
};
