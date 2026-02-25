/* =============================================
   FINZEN — Interactive Logic & Tracking
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- NAVIGATION & UI ----------
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    let current = '';
    const sections = document.querySelectorAll('section, header');
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (pageYOffset >= sectionTop - 100) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').includes(current)) {
        link.classList.add('active');
      }
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 70,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // ---------- DATA STATE ----------
  let appData = JSON.parse(localStorage.getItem('finzenData')) || {
    income: 5000,
    expenses: [],
    goals: [],
    savedCalculations: [],
    portfolio: [],
    lastUpdated: new Date().toISOString()
  };

  if (!appData.portfolio) appData.portfolio = [];

  let allocationChartInstance = null;

  const saveData = () => {
    localStorage.setItem('finzenData', JSON.stringify(appData));
    renderAll();
  };

  // ---------- DOM ELEMENTS ----------
  const dashIncome = document.getElementById('dashIncome');
  const dashExpenses = document.getElementById('dashExpenses');
  const dashBalance = document.getElementById('dashBalance');
  const expenseList = document.getElementById('expenseList');
  const goalsGrid = document.getElementById('goalsGrid');
  const toast = document.getElementById('toast');

  const expenseModal = document.getElementById('expenseModal');
  const goalModal = document.getElementById('goalModal');
  const expenseForm = document.getElementById('expenseForm');
  const goalForm = document.getElementById('goalForm');

  // ---------- UTILS ----------
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  // ---------- MODAL HANDLERS ----------
  const openModal = (m) => m.classList.add('active');
  const closeModal = (m) => m.classList.remove('active');

  document.getElementById('btnOpenExpenseModal')?.addEventListener('click', () => {
    expenseForm.reset();
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    openModal(expenseModal);
  });

  document.getElementById('btnOpenGoalModal')?.addEventListener('click', () => {
    goalForm.reset();
    document.getElementById('goalId').value = '';
    openModal(goalModal);
  });

  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModal(e.target.closest('.modal-overlay'));
    });
  });

  // ---------- ANALYTICS LOGIC ----------
  const getAnalytics = () => {
    const totalExp = appData.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balance = appData.income - totalExp;
    const savingsRatio = (balance / appData.income) * 100;

    // Financial Health Score (Simple logic: 0-100)
    // 20% savings = Good (80+ score)
    const healthScore = Math.min(Math.max(Math.round(savingsRatio * 4), 0), 100);

    // Top Spending Category
    const categoryTotals = appData.expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
      return acc;
    }, {});

    let topCategory = "N/A";
    let maxAmt = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > maxAmt) {
        maxAmt = amt;
        topCategory = cat;
      }
    }

    return { healthScore, topCategory, totalExp, balance };
  };

  // ---------- CHART LOGIC ----------
  let chartInstance = null;
  const updateChart = () => {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    const categories = [...new Set(appData.expenses.map(e => e.category))];

    // If no expenses, show a placeholder "Zero" chart
    const labels = categories.length ? categories : ['No Data'];
    const data = categories.length ? categories.map(cat => {
      return appData.expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    }) : [1];

    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: categories.length ? ['#6C63FF', '#3CD3AD', '#A78BFA', '#F43F5E', '#F59E0B', '#10B981'] : ['#e2e8f0'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%',
        plugins: {
          legend: { display: false }
        }
      }
    });
  };

  // ---------- RENDERING ----------
  let currentSearch = '';

  const renderAll = () => {
    // Analytics
    const analytics = getAnalytics();

    // Summary
    dashIncome.textContent = formatCurrency(appData.income);
    dashExpenses.textContent = formatCurrency(analytics.totalExp);
    dashBalance.textContent = formatCurrency(analytics.balance);

    // Update Insights in DOM if elements exist
    const healthScoreEl = document.getElementById('healthScore');
    const topCatEl = document.getElementById('topCategory');
    if (healthScoreEl) healthScoreEl.textContent = `${analytics.healthScore}/100`;
    if (topCatEl) topCatEl.textContent = analytics.topCategory;

    // Expenses
    const filteredExpenses = appData.expenses.filter(exp =>
      exp.category.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(currentSearch.toLowerCase()))
    );

    expenseList.innerHTML = filteredExpenses.length ? '' : '<p class="empty-state">No matching expenses found.</p>';

    filteredExpenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5) // Last 5
      .forEach(exp => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
          <div class="exp-icon">📦</div>
          <div class="exp-info">
            <h4>${exp.category}</h4>
            <span>${new Date(exp.date).toLocaleDateString()}</span>
          </div>
          <div class="exp-amount">-${formatCurrency(exp.amount)}</div>
          <div class="item-actions">
             <button class="btn-icon btn-delete" data-id="${exp.id}">🗑️</button>
          </div>
        `;
        expenseList.appendChild(item);
      });

    // Goals
    goalsGrid.innerHTML = appData.goals.length ? '' : '<p class="empty-state">No goals set yet.</p>';
    appData.goals.forEach(goal => {
      const prog = Math.min(Math.round((parseFloat(goal.saved || 0) / parseFloat(goal.target)) * 100), 100);
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.innerHTML = `
        <div class="goal-icon">${goal.icon || '🎯'}</div>
        <div class="goal-info-live">
          <div class="goal-top">
            <h4>${goal.name}</h4>
            <span>${prog}%</span>
          </div>
          <div class="progress-bar"><div class="fill" style="width: ${prog}%"></div></div>
          <div class="goal-stats">
            <span>Saved: ${formatCurrency(goal.saved || 0)}</span>
            <span>Target: ${formatCurrency(goal.target)}</span>
          </div>
        </div>
        <div class="item-actions">
           <button class="btn-icon btn-delete-goal" data-id="${goal.id}">🗑️</button>
        </div>
      `;
      goalsGrid.appendChild(item);
    });

    // Saved Calculations
    const savedCalcsList = document.getElementById('savedCalcsList');
    if (savedCalcsList) {
      savedCalcsList.innerHTML = appData.savedCalculations?.length ? '' : '<p class="empty-state">No saved results yet.</p>';
      (appData.savedCalculations || []).slice().reverse().forEach(calc => {
        const item = document.createElement('div');
        item.className = 'saved-calc-item';
        item.innerHTML = `
          <div class="saved-calc-info">
            <h5>${calc.type} Result</h5>
            <span>${new Date(calc.date).toLocaleDateString()}</span>
          </div>
          <div class="saved-calc-val">${calc.result}</div>
        `;
        savedCalcsList.appendChild(item);
      });
    }

    updateChart();
    renderPortfolio();
    attachListeners();
  };

  const renderPortfolio = () => {
    const investList = document.getElementById('investList');
    const investEmpty = document.getElementById('investEmpty');
    const portInvested = document.getElementById('portInvested');
    const portCurrent = document.getElementById('portCurrent');
    const portPL = document.getElementById('portPL');
    const portPLPct = document.getElementById('portPLPct');
    const divScore = document.getElementById('divScore');
    const topBranch = document.getElementById('topBranch');
    const riskLabel = document.getElementById('riskLabel');

    if (!investList) return;

    let totalInv = 0, totalCurr = 0;
    const typeAllocation = {};
    investList.innerHTML = '';

    if (appData.portfolio.length === 0) {
      investEmpty.style.display = 'block';
    } else {
      investEmpty.style.display = 'none';
      appData.portfolio.forEach((inv, idx) => {
        const simGain = (Math.sin(idx + Date.now() / 1000000) * 0.1) + 1.05;
        const currentPrice = inv.price * simGain;
        const invVal = inv.qty * inv.price;
        const currVal = inv.qty * currentPrice;
        const pl = currVal - invVal;
        const plPct = (pl / invVal) * 100;
        totalInv += invVal; totalCurr += currVal;
        typeAllocation[inv.type] = (typeAllocation[inv.type] || 0) + currVal;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><div class="asset-name-cell"><strong>${inv.name}</strong><span class="asset-type-badge">${inv.type}</span></div></td>
          <td>${inv.qty}</td>
          <td>${formatCurrency(inv.price)}</td>
          <td>${formatCurrency(currentPrice)}</td>
          <td class="pl-cell ${pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(pl)} (${plPct.toFixed(1)}%)</td>
          <td><button class="btn-icon btn-delete-inv" data-index="${idx}">🗑️</button></td>
        `;
        investList.appendChild(row);
      });
    }

    const totalPL = totalCurr - totalInv;
    const totalPLPct = totalInv > 0 ? (totalPL / totalInv) * 100 : 0;
    portInvested.textContent = formatCurrency(totalInv);
    portCurrent.textContent = formatCurrency(totalCurr);
    portPL.textContent = formatCurrency(totalPL);
    portPL.className = `value ${totalPL >= 0 ? 'text-success' : 'text-danger'}`;
    portPLPct.textContent = `${totalPLPct.toFixed(1)}%`;
    portPLPct.className = `change-pct ${totalPLPct >= 0 ? 'pos' : 'neg'}`;

    const types = Object.keys(typeAllocation);
    divScore.textContent = `${Math.min(types.length * 20, 100)}/100`;
    let maxType = "N/A", maxVal = 0;
    types.forEach(t => { if (typeAllocation[t] > maxVal) { maxVal = typeAllocation[t]; maxType = t; } });
    topBranch.textContent = maxType;

    const cryptoShare = (typeAllocation['Crypto'] || 0) / (totalCurr || 1);
    if (cryptoShare > 0.4) { riskLabel.textContent = 'High'; riskLabel.className = 'preview-tag risk-tag high'; }
    else if (cryptoShare > 0.1 || types.length < 2) { riskLabel.textContent = 'Medium'; riskLabel.className = 'preview-tag risk-tag med'; }
    else { riskLabel.textContent = 'Low'; riskLabel.className = 'preview-tag risk-tag low'; }

    updateAllocationChart(typeAllocation);
    document.querySelectorAll('.btn-delete-inv').forEach(btn => {
      btn.onclick = () => { appData.portfolio.splice(parseInt(btn.dataset.index), 1); saveData(); };
    });
  };

  const updateAllocationChart = (allocationData) => {
    const ctx = document.getElementById('allocationChart')?.getContext('2d');
    if (!ctx) return;
    if (allocationChartInstance) allocationChartInstance.destroy();
    const l = Object.keys(allocationData), d = Object.values(allocationData);
    if (l.length === 0) return;
    allocationChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: l, datasets: [{ data: d, backgroundColor: ['#6C63FF', '#3CD3AD', '#FFB155', '#FF6B6B', '#A78BFA'], borderWidth: 0, cutout: '70%' }] },
      options: { plugins: { legend: { display: false } } }
    });
  };

  const attachListeners = () => {
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick = () => {
        appData.expenses = appData.expenses.filter(e => e.id !== btn.dataset.id);
        saveData();
        showToast('Expense removed');
      };
    });
    document.querySelectorAll('.btn-delete-goal').forEach(btn => {
      btn.onclick = () => {
        appData.goals = appData.goals.filter(g => g.id !== btn.dataset.id);
        saveData();
        showToast('Goal removed');
      };
    });
  };

  // ---------- FORM SUBMISSIONS ----------
  expenseForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Date.now().toString();
    const newExp = {
      id,
      amount: document.getElementById('expAmount').value,
      category: document.getElementById('expCategory').value,
      date: document.getElementById('expDate').value,
      description: document.getElementById('expDescription').value
    };
    appData.expenses.push(newExp);
    saveData();
    closeModal(expenseModal);
    showToast('Expense added');
  });

  goalForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Date.now().toString();
    const newGoal = {
      id,
      name: document.getElementById('goalName').value,
      target: document.getElementById('goalTarget').value,
      contribution: document.getElementById('goalContribution').value,
      saved: document.getElementById('goalSaved').value || 0,
      date: document.getElementById('goalDate').value,
      icon: document.getElementById('goalIcon').value || '🎯'
    };
    appData.goals.push(newGoal);
    saveData();
    closeModal(goalModal);
    showToast('Goal created');
  });

  // ---------- SEARCH ----------
  document.getElementById('expenseSearch')?.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderAll();
  });

  // ---------- ADVANCED CALCULATORS ----------
  const calcModal = document.getElementById('calcModal');
  const calcTitle = document.getElementById('calcModalTitle');
  const calcResultValue = document.getElementById('calcResultValue');
  const calcInputsContainer = document.getElementById('calcInputsContainer');
  let currentCalcType = '';
  let calcChartInstance = null;

  const calculators = {
    sip: {
      title: "SIP Calculator",
      inputs: [
        { id: 'sipMonthly', label: 'Monthly Investment ($)', type: 'number', value: 1000 },
        { id: 'sipRate', label: 'Expected Return Rate (%)', type: 'number', value: 12 },
        { id: 'sipYears', label: 'Time Period (Years)', type: 'number', value: 10 }
      ],
      calculate: (vals) => {
        const p = vals.sipMonthly;
        const i = (vals.sipRate / 100) / 12;
        const n = vals.sipYears * 12;
        const totalValue = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        const investedAmount = p * n;
        const wealthGained = totalValue - investedAmount;
        return {
          total: totalValue,
          chartData: [investedAmount, wealthGained],
          labels: ['Invested Amount', 'Wealth Gained'],
          formatted: formatCurrency(totalValue)
        };
      }
    },
    compound: {
      title: "Compound Interest",
      inputs: [
        { id: 'ciPrincipal', label: 'Principal Amount ($)', type: 'number', value: 5000 },
        { id: 'ciRate', label: 'Interest Rate (%)', type: 'number', value: 8 },
        { id: 'ciYears', label: 'Time Period (Years)', type: 'number', value: 5 }
      ],
      calculate: (vals) => {
        const p = vals.ciPrincipal;
        const r = vals.ciRate / 100;
        const t = vals.ciYears;
        const n = 1; // compounded annually
        const totalValue = p * Math.pow(1 + r / n, n * t);
        const interest = totalValue - p;
        return {
          total: totalValue,
          chartData: [p, interest],
          labels: ['Principal', 'Interest'],
          formatted: formatCurrency(totalValue)
        };
      }
    },
    emergency: {
      title: "Emergency Fund",
      inputs: [
        { id: 'efMonthly', label: 'Monthly Expenses ($)', type: 'number', value: 2000 },
        { id: 'efMonths', label: 'Safety Net (Months)', type: 'number', value: 6 }
      ],
      calculate: (vals) => {
        const target = vals.efMonthly * vals.efMonths;
        return {
          total: target,
          chartData: [target],
          labels: ['Target Fund'],
          formatted: formatCurrency(target)
        };
      }
    },
    emi: {
      title: "Loan EMI Calculator",
      inputs: [
        { id: 'loanAmt', label: 'Loan Amount ($)', type: 'number', value: 200000 },
        { id: 'loanRate', label: 'Interest Rate (%)', type: 'number', value: 8.5 },
        { id: 'loanYears', label: 'Tenure (Years)', type: 'number', value: 20 }
      ],
      calculate: (vals) => {
        const p = vals.loanAmt;
        const r = (vals.loanRate / 100) / 12;
        const n = vals.loanYears * 12;
        const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        const totalPayable = emi * n;
        const totalInterest = totalPayable - p;
        return {
          total: emi,
          chartData: [p, totalInterest],
          labels: ['Principal', 'Total Interest'],
          formatted: `${formatCurrency(emi)} / mo`
        };
      }
    },
    projection: {
      title: "Savings Projection",
      inputs: [
        { id: 'spInitial', label: 'Current Savings ($)', type: 'number', value: 10000 },
        { id: 'spMonthly', label: 'Monthly Contribution ($)', type: 'number', value: 500 },
        { id: 'spRate', label: 'Interest Rate (%)', type: 'number', value: 5 },
        { id: 'spYears', label: 'Years to Save', type: 'number', value: 10 }
      ],
      calculate: (vals) => {
        const p = vals.spInitial;
        const m = vals.spMonthly;
        const r = (vals.spRate / 100) / 12;
        const n = vals.spYears * 12;
        const futureValue = p * Math.pow(1 + r, n) + m * ((Math.pow(1 + r, n) - 1) / r);
        const invested = p + (m * n);
        return {
          total: futureValue,
          chartData: [invested, futureValue - invested],
          labels: ['Total Contributed', 'Interest Earned'],
          formatted: formatCurrency(futureValue)
        };
      }
    },
    fire: {
      title: "FIRE Calculator",
      inputs: [
        { id: 'fireExpenses', label: 'Annual Expenses ($)', type: 'number', value: 40000 },
        { id: 'fireWithdrawal', label: 'Withdrawal Rate (%)', type: 'number', value: 4 }
      ],
      calculate: (vals) => {
        const fireNumber = vals.fireExpenses / (vals.fireWithdrawal / 100);
        return {
          total: fireNumber,
          chartData: [fireNumber],
          labels: ['FIRE Number'],
          formatted: formatCurrency(fireNumber)
        };
      }
    }
  };

  const updateCalcViz = () => {
    if (!currentCalcType) return;
    const inputs = calculators[currentCalcType].inputs;
    const vals = {};
    inputs.forEach(input => {
      vals[input.id] = parseFloat(document.getElementById(input.id)?.value) || 0;
    });

    const result = calculators[currentCalcType].calculate(vals);
    calcResultValue.textContent = result.formatted;

    const ctx = document.getElementById('calcChart')?.getContext('2d');
    if (!ctx) return;
    if (calcChartInstance) calcChartInstance.destroy();

    calcChartInstance = new Chart(ctx, {
      type: result.chartData.length > 1 ? 'pie' : 'doughnut',
      data: {
        labels: result.labels,
        datasets: [{
          data: result.chartData,
          backgroundColor: ['#6C63FF', '#3CD3AD', '#A78BFA'],
          borderWidth: 0
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
        }
      }
    });
  };

  document.querySelectorAll('.open-calc').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.closest('.calc-card').dataset.calc;
      currentCalcType = type;
      const config = calculators[type];

      calcTitle.textContent = config.title;
      calcInputsContainer.innerHTML = '';

      config.inputs.forEach(input => {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
          <label>${input.label}</label>
          <input type="${input.type}" id="${input.id}" value="${input.value}" step="any" />
        `;
        calcInputsContainer.appendChild(group);

        group.querySelector('input').addEventListener('input', updateCalcViz);
      });

      openModal(document.getElementById('calcModal'));
      updateCalcViz();
    });
  });

  document.getElementById('btnSaveCalc')?.addEventListener('click', () => {
    const res = calcResultValue.textContent;
    const typeLabel = calculators[currentCalcType].title;

    if (!appData.savedCalculations) appData.savedCalculations = [];
    appData.savedCalculations.push({
      type: typeLabel,
      result: res,
      date: new Date().toISOString()
    });

    saveData();
    showToast('Calculation saved to dashboard');
  });

  // ---------- TESTIMONIAL CAROUSEL ----------
  const carousel = document.getElementById('testimonialCarousel');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');

  if (carousel && prevBtn && nextBtn) {
    let index = 0;
    const cards = carousel.querySelectorAll('.testimonial-card');
    const updateCarousel = () => {
      const cardWidth = cards[0].offsetWidth + 32;
      carousel.style.transform = `translateX(${-index * cardWidth}px)`;
    };
    nextBtn.addEventListener('click', () => {
      if (index < cards.length - 3) { index++; updateCarousel(); }
    });
    prevBtn.addEventListener('click', () => {
      if (index > 0) { index--; updateCarousel(); }
    });
    window.addEventListener('resize', updateCarousel);
  }

  // ---------- LEARNING MODALS ----------
  const learnModal = document.getElementById('learnModal');
  const learnTitle = document.getElementById('learnModalTitle');
  const learnContent = document.getElementById('learnModalContent');

  const learnData = {
    budgeting: {
      title: "Budgeting Basics: 50/30/20 Rule",
      content: `
        <p>The 50/30/20 rule is a simple way to manage your money:</p>
        <h4>50% Needs</h4>
        <p>Rent, groceries, utilities, and insurance. The "must-haves".</p>
        <h4>30% Wants</h4>
        <p>Dining out, subscriptions, shopping, and hobbies. Your lifestyle choices.</p>
        <h4>20% Savings & Debt</h4>
        <p>Emergency fund, 401k, or paying down student loans.</p>
      `
    },
    investing: {
      title: "Investing 101 for Gen Z",
      content: `
        <p>Time is your biggest asset! Start small with Index Funds (ETFs).</p>
        <h4>Compound Interest</h4>
        <p>Investing $100/month starting at 20 can lead to much more wealth than starting at 30.</p>
        <h4>Risk vs Reward</h4>
        <p>Diversify your portfolio across different sectors to stay safe while growing your money.</p>
      `
    },
    saving: {
      title: "Pro Saving Hacks",
      content: `
        <p>Saving doesn't have to feel like a chore.</p>
        <h4>The 24-Hour Rule</h4>
        <p>Wait 24 hours before buying anything over $50. Usually, the urge goes away!</p>
        <h4>Subscription Audit</h4>
        <p>Check your card statement for autopays you forgot about. Cancel them immediately.</p>
      `
    },
    credit: {
      title: "Build Credit From Zero",
      content: `
        <p>Your credit score affects your future house, car, and even job hunt.</p>
        <h4>Secured Cards</h4>
        <p>Start with a secured card if you have no history. Pay it in full every month!</p>
        <h4>On-Time Payments</h4>
        <p>This is 35% of your score. Never, ever miss a payment.</p>
      `
    }
  };

  document.querySelectorAll('.learn-card').forEach(card => {
    card.addEventListener('click', () => {
      const topic = card.dataset.topic;
      if (learnData[topic]) {
        learnTitle.textContent = learnData[topic].title;
        learnContent.innerHTML = learnData[topic].content;
        openModal(learnModal);
      }
    });
  });

  // ---------- THEME TOGGLE ----------
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  // Check saved theme
  const savedTheme = localStorage.getItem('finzenTheme') || 'light';
  body.setAttribute('data-theme', savedTheme);

  themeToggle?.addEventListener('click', () => {
    const isDark = body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('finzenTheme', newTheme);
    showToast(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode active`);
  });

  // ---------- MONITORING DATA UPDATES FOR AI ----------
  const getSimulatedAIResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    const analytics = getAnalytics();

    // Knowledge Base / Keywords
    const keywords = {
      spending: ["spend", "expense", "cost", "track", "bought", "buy"],
      savings: ["save", "saving", "goal", "emergency", "fund"],
      investing: ["invest", "stock", "etf", "mutual", "sip", "compound"],
      help: ["help", "how", "what", "can you", "guide", "mentor"],
      health: ["health", "score", "status", "analysis", "summary"],
      terms: ["sip", "emi", "fire", "interest", "credit", "score"],
      portfolio: ["portfolio", "investment", "stocks", "crypto", "allocation", "profit", "loss"]
    };

    // Portfolio Analysis
    if (keywords.portfolio.some(k => msg.includes(k))) {
      if (appData.portfolio.length === 0) return "Your portfolio is currently empty. Start by adding some stocks or mutual funds in the **Investment Portfolio** section!";

      let totalInv = 0;
      let totalCurr = 0;
      appData.portfolio.forEach((inv, idx) => {
        const simGain = (Math.sin(idx + Date.now() / 1000000) * 0.1) + 1.05;
        totalInv += inv.qty * inv.price;
        totalCurr += inv.qty * (inv.price * simGain);
      });
      const pl = totalCurr - totalInv;
      const plPct = (pl / totalInv) * 100;

      if (plPct > 5) {
        return `Your portfolio is performing remarkably well with a **${plPct.toFixed(1)}%** profit (**${formatCurrency(pl)}**). Your current holdings are worth **${formatCurrency(totalCurr)}**. Diversification is key to maintaining these gains!`;
      } else if (plPct < -5) {
        return `Markets are a bit volatile right now. Your portfolio is down by **${Math.abs(plPct).toFixed(1)}%**. Remember, investing is a marathon, not a sprint. Stick to your long-term plan!`;
      }
      return `Your portfolio value is **${formatCurrency(totalCurr)}** with a net P/L of **${formatCurrency(pl)}**. You have a good base—want me to suggest some allocation tweaks?`;
    }

    // Spending Analysis
    if (keywords.spending.some(k => msg.includes(k))) {
      const topCat = analytics.topCategory;
      if (topCat === "N/A") return "You haven't tracked many expenses yet! Try adding some so I can analyze your spending patterns.";
      return `I see you're spending the most on **${topCat}**. Your total expenses this month are **${formatCurrency(analytics.totalExp)}**. Maybe we can look at your ${topCat} habits to find some extra savings?`;
    }

    // Savings Advice
    if (keywords.savings.some(k => msg.includes(k))) {
      const savingsRatio = Math.round((analytics.balance / appData.income) * 100);
      if (savingsRatio < 20) {
        return `You're currently saving about **${savingsRatio}%** of your income. Gen Z financial experts recommend the 50/30/20 rule—aiming for 20% savings. Your balance is **${formatCurrency(analytics.balance)}**. Want to set a new goal?`;
      }
      return `Impressive! You're saving **${savingsRatio}%** of your income. That's way above the average. Keep building that emergency fund!`;
    }

    // Investment Guidance
    if (keywords.investing.some(k => msg.includes(k))) {
      return "Investing is key to long-term wealth! As a Gen Z professional, you have time on your side. Have you checked out our **SIP Calculator**? It's great for seeing how small monthly amounts grow over time.";
    }

    // Financial Health Summary
    if (keywords.health.some(k => msg.includes(k))) {
      return `Your Financial Health Score is **${analytics.healthScore}/100**. This is based on your savings-to-income ratio. A score above 70 is excellent! You're doing great with a balance of **${formatCurrency(analytics.balance)}**.`;
    }

    // Terms Explanation
    if (msg.includes("sip")) return "SIP stands for **Systematic Investment Plan**. It's a way to invest a fixed amount regularly (monthly) in mutual funds. It helps with rupee-cost averaging and compounding.";
    if (msg.includes("fire")) return "FIRE stands for **Financial Independence, Retire Early**. The goal is to save enough (usually 25x your annual expenses) so you can live off your investments forever.";
    if (msg.includes("emi")) return "EMI is **Equated Monthly Installment**. It's the fixed amount you pay back on a loan every month until the loan is fully paid off (Principal + Interest).";
    if (msg.includes("credit")) return "Your **Credit Score** is a number that tells banks how trustworthy you are with loans. Pay your bills in full and on time to keep it high!";

    // Default
    return "That's an interesting question! I can analyze your spending, explain financial terms like SIP/FIRE, or give you a health summary. What would you like to know more about?";
  };

  // ---------- AI CHAT UI ----------
  const aiTrigger = document.getElementById('aiTrigger');
  const aiWindow = document.getElementById('aiWindow');
  const aiClose = document.getElementById('aiClose');
  const aiFullscreen = document.getElementById('aiFullscreen');
  const aiForm = document.getElementById('aiForm');
  const aiInput = document.getElementById('aiInput');
  const aiMessages = document.getElementById('aiMessages');
  const aiTyping = document.getElementById('aiTyping');

  aiTrigger?.addEventListener('click', () => {
    aiWindow.classList.add('active');
    aiTrigger.style.display = 'none';
  });

  aiClose?.addEventListener('click', () => {
    aiWindow.classList.remove('active');
    aiTrigger.style.display = 'flex';
  });

  aiFullscreen?.addEventListener('click', () => {
    aiWindow.classList.toggle('fullscreen');
  });

  const appendMsg = (text, role) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${role}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
    aiMessages.appendChild(msgDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  };

  aiForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = aiInput.value.trim();
    if (!text) return;

    // User Message
    appendMsg(text, 'user');
    aiInput.value = '';

    // Simulated Bot Response
    aiTyping.style.display = 'flex';
    aiMessages.scrollTop = aiMessages.scrollHeight;

    setTimeout(() => {
      aiTyping.style.display = 'none';
      const response = getSimulatedAIResponse(text);
      appendMsg(response, 'bot');
    }, 1000 + Math.random() * 1000);
  });

  // ---------- PORTFOLIO FORMS ----------
  const investModal = document.getElementById('investModal');
  const investForm = document.getElementById('investForm');
  document.getElementById('btnOpenInvestModal')?.addEventListener('click', () => openModal(investModal));

  investForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    appData.portfolio.push({
      name: document.getElementById('invName').value,
      type: document.getElementById('invType').value,
      qty: parseFloat(document.getElementById('invQty').value),
      price: parseFloat(document.getElementById('invPrice').value),
      date: document.getElementById('invDate').value
    });
    saveData(); closeModal(investModal); investForm.reset();
    showToast('Asset added to portfolio!');
  });

  // ---------- INIT ----------
  renderAll();
});
