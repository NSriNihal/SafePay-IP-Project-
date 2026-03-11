(function () {
  const USER_KEY = "safepayUsers";
  const CURRENT_USER_KEY = "safepayCurrentUser";
  const PENDING_TXN_KEY = "safepayPendingTransaction";
  const LAST_RECEIPT_KEY = "safepayLastReceipt";
  const BALANCE_ACCESS_KEY = "safepayBalanceAccess";
  const OTP_KEY = "safepayOtpSession";

  const seedUsers = [
    {
      email: "nihal@gmail.com",
      password: "nihal@123",
      pin: "123456",
      profile: {
        fullName: "Nihal",
        mobile: "9876543210",
        gender: "Male",
        dob: "2004-08-15",
        accountNumber: "123456789012",
        accountType: "Savings",
        bankName: "SafePay Bank"
      },
      balance: 50000,
      transactions: []
    },
    {
      email: "rahul@gmail.com",
      password: "rahul@123",
      pin: "654321",
      profile: {
        fullName: "Rahul",
        mobile: "9123456780",
        gender: "Male",
        dob: "2003-03-10",
        accountNumber: "987654321098",
        accountType: "Savings",
        bankName: "SafePay Bank"
      },
      balance: 32500,
      transactions: []
    }
  ];

  function loadUsers() {
    const stored = JSON.parse(localStorage.getItem(USER_KEY));
    if (Array.isArray(stored) && stored.length) {
      return stored;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(seedUsers));
    return JSON.parse(localStorage.getItem(USER_KEY)) || [];
  }

  function saveUsers(users) {
    localStorage.setItem(USER_KEY, JSON.stringify(users));
  }

  function getCurrentUserEmail() {
    return localStorage.getItem(CURRENT_USER_KEY);
  }

  function setCurrentUserEmail(email) {
    localStorage.setItem(CURRENT_USER_KEY, email);
  }

  function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(PENDING_TXN_KEY);
    localStorage.removeItem(BALANCE_ACCESS_KEY);
    localStorage.removeItem(OTP_KEY);
  }

  function findUserByEmail(email) {
    return loadUsers().find(function (user) {
      return user.email.toLowerCase() === String(email).toLowerCase();
    }) || null;
  }

  function findUserByAccount(accountNumber) {
    return loadUsers().find(function (user) {
      return user.profile.accountNumber === accountNumber;
    }) || null;
  }

  function generateAccountNumber() {
    let accountNumber = "";

    do {
      accountNumber = String(Math.floor(100000000000 + Math.random() * 900000000000));
    } while (findUserByAccount(accountNumber));

    return accountNumber;
  }

  function getCurrentUser() {
    const email = getCurrentUserEmail();
    if (!email) {
      return null;
    }
    return findUserByEmail(email);
  }

  function requireAuth() {
    if (!getCurrentUser()) {
      globalThis.location.href = "login.html";
      return false;
    }
    return true;
  }

  function updateCurrentUser(mutator) {
    const email = getCurrentUserEmail();
    const users = loadUsers();
    const index = users.findIndex(function (user) {
      return user.email === email;
    });

    if (index === -1) {
      return null;
    }

    const updatedUser = mutator(users[index]);
    users[index] = updatedUser;
    saveUsers(users);
    return updatedUser;
  }

  function createUser(details) {
    const users = loadUsers();
    const email = String(details.email).trim().toLowerCase();

    if (findUserByEmail(email)) {
      return { ok: false, message: "Email already registered." };
    }

    const user = {
      email: email,
      password: details.password,
      pin: details.pin,
      profile: {
        fullName: details.fullName,
        mobile: details.mobile,
        gender: details.gender || "Others",
        dob: details.dob || "",
        accountNumber: generateAccountNumber(),
        accountType: "Savings",
        bankName: "SafePay Bank"
      },
      balance: 1000000,
      transactions: []
    };

    users.push(user);
    saveUsers(users);
    return { ok: true, user: user };
  }

  function deleteCurrentUser() {
    const email = getCurrentUserEmail();
    if (!email) {
      return { ok: false, message: "No user is logged in." };
    }

    const users = loadUsers().filter(function (user) {
      return user.email !== email;
    });

    saveUsers(users);
    clearCurrentUser();
    localStorage.removeItem(LAST_RECEIPT_KEY);
    return { ok: true };
  }

  function formatCurrency(amount) {
    return "Rs " + Number(amount).toLocaleString("en-IN");
  }

  function createTransactionId() {
    return "TXN" + Date.now();
  }

  function setPendingTransaction(transaction) {
    localStorage.setItem(PENDING_TXN_KEY, JSON.stringify(transaction));
  }

  function getPendingTransaction() {
    return JSON.parse(localStorage.getItem(PENDING_TXN_KEY));
  }

  function clearPendingTransaction() {
    localStorage.removeItem(PENDING_TXN_KEY);
  }

  function setOtpSession(session) {
    localStorage.setItem(OTP_KEY, JSON.stringify(session));
  }

  function getOtpSession() {
    return JSON.parse(localStorage.getItem(OTP_KEY));
  }

  function clearOtpSession() {
    localStorage.removeItem(OTP_KEY);
  }

  function grantBalanceAccess() {
    localStorage.setItem(BALANCE_ACCESS_KEY, "true");
  }

  function consumeBalanceAccess() {
    const allowed = localStorage.getItem(BALANCE_ACCESS_KEY) === "true";
    localStorage.removeItem(BALANCE_ACCESS_KEY);
    return allowed;
  }

  function setLastReceipt(receipt) {
    localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(receipt));
  }

  function getLastReceipt() {
    return JSON.parse(localStorage.getItem(LAST_RECEIPT_KEY));
  }

  function commitPendingTransaction() {
    const pending = getPendingTransaction();
    const sender = getCurrentUser();
    if (!pending || !sender) {
      return { ok: false, message: "No pending transaction found." };
    }

    const receiver = findUserByAccount(pending.to);
    if (!receiver) {
      clearPendingTransaction();
      return { ok: false, message: "Receiver account no longer exists." };
    }

    if (sender.balance < pending.amount) {
      clearPendingTransaction();
      return { ok: false, message: "Insufficient balance." };
    }

    const completedAt = new Date().toLocaleString("en-IN");
    const senderEntry = {
      id: pending.id,
      date: completedAt,
      to: receiver.profile.accountNumber,
      toName: receiver.profile.fullName,
      amount: pending.amount,
      type: "Debit",
      status: "Success"
    };
    const receiverEntry = {
      id: pending.id,
      date: completedAt,
      to: sender.profile.accountNumber,
      toName: sender.profile.fullName,
      amount: pending.amount,
      type: "Credit",
      status: "Success"
    };

    const users = loadUsers().map(function (user) {
      if (user.email === sender.email) {
        return {
          ...user,
          balance: user.balance - pending.amount,
          transactions: [senderEntry].concat(user.transactions || [])
        };
      }

      if (user.email === receiver.email) {
        return {
          ...user,
          balance: user.balance + pending.amount,
          transactions: [receiverEntry].concat(user.transactions || [])
        };
      }

      return user;
    });

    saveUsers(users);
    const receipt = {
      id: pending.id,
      date: completedAt,
      senderName: sender.profile.fullName,
      receiverName: receiver.profile.fullName,
      bank: receiver.profile.bankName,
      amount: pending.amount,
      status: "Successful",
      type: "Account Transfer"
    };
    setLastReceipt(receipt);
    clearPendingTransaction();
    clearOtpSession();
    return { ok: true, receipt: receipt };
  }

  function attachLogout() {
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    logoutLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        clearCurrentUser();
      });
    });
  }

  loadUsers();
  attachLogout();

  globalThis.SafePay = {
    createUser: createUser,
    deleteCurrentUser: deleteCurrentUser,
    findUserByEmail: findUserByEmail,
    findUserByAccount: findUserByAccount,
    getCurrentUser: getCurrentUser,
    setCurrentUserEmail: setCurrentUserEmail,
    clearCurrentUser: clearCurrentUser,
    requireAuth: requireAuth,
    updateCurrentUser: updateCurrentUser,
    formatCurrency: formatCurrency,
    createTransactionId: createTransactionId,
    setPendingTransaction: setPendingTransaction,
    getPendingTransaction: getPendingTransaction,
    clearPendingTransaction: clearPendingTransaction,
    setOtpSession: setOtpSession,
    getOtpSession: getOtpSession,
    clearOtpSession: clearOtpSession,
    grantBalanceAccess: grantBalanceAccess,
    consumeBalanceAccess: consumeBalanceAccess,
    commitPendingTransaction: commitPendingTransaction,
    getLastReceipt: getLastReceipt
  };
})();
