// charts.js - Optimized with better event handling and organization
document.addEventListener("DOMContentLoaded", function() {
  let chartInstances = [];

  // Helper function to destroy existing charts
  const destroyCharts = () => {
    chartInstances.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    chartInstances = [];
  };

  // Color configurations
  const CHART_COLORS = {
    donut: [
      'rgba(59, 130, 246, 0.8)',   // blue-500
      'rgba(37, 99, 235, 0.8)',    // blue-600
      'rgba(29, 78, 216, 0.8)',    // blue-700
      'rgba(30, 64, 175, 0.8)',    // blue-800
      'rgba(23, 37, 84, 0.8)',     // blue-900
      'rgba(96, 165, 250, 0.8)',   // blue-400
      'rgba(147, 197, 253, 0.8)',  // blue-300
      'rgba(191, 219, 254, 0.8)',  // blue-200
    ],
    singleBlue: 'rgba(59, 130, 246, 0.8)',
    singlePurple: 'rgba(165, 44, 230, 0.98)'
  };

  // Common chart options
  const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' },
        ticks: {
          color: '#374151',
          callback: function(value) {
            return '₱' + value.toLocaleString();
          }
        }
      },
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.1)' },
        ticks: { color: '#374151' }
      }
    }
  };

  // ========== FUND ALLOCATION BY PROGRAM ==========
  const createProgramChart = (programLabels, programData) => {
    const programCanvas = document.getElementById("programChart");
    if (!programCanvas) return null;

    const ctx = programCanvas.getContext("2d");

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: programLabels,
        datasets: [
          {
            label: "Allocation (₱)",
            data: programData,
            backgroundColor: CHART_COLORS.singleBlue,
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...CHART_OPTIONS,
        plugins: {
          ...CHART_OPTIONS.plugins,
          legend: { display: false },
          tooltip: {
            ...CHART_OPTIONS.plugins.tooltip,
            callbacks: {
              label: (ctx) => `₱${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            }
          }
        }
      },
    });

    return chart;
  };

  // ========== OBLIGATION DISTRIBUTION ==========
  const createExpenseChart = (programLabels, obligationData) => {
    const expenseCanvas = document.getElementById("expenseChart");
    if (!expenseCanvas) return null;

    const ctx = expenseCanvas.getContext("2d");

    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: programLabels,
        datasets: [
          {
            label: "Obligation (₱)",
            data: obligationData,
            backgroundColor: CHART_COLORS.donut,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: '#374151',
              font: { size: 11 },
              padding: 15
            }
          },
          tooltip: {
            ...CHART_OPTIONS.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0";
                return `${ctx.label}: ₱${ctx.parsed.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        },
      },
    });

    return chart;
  };

  // ========== UNOBLIGATED BALANCES BY PROGRAM ==========
  const createUnobligatedProgramChart = (dataRows, COL) => {
    const unobligatedProgramCanvas = document.getElementById("unobligatedProgramChart");
    if (!unobligatedProgramCanvas) return null;

    // Calculate unobligated balances by program
    const programUnobligated = {};
    dataRows.forEach((r) => {
      const prog = r[COL.PROGRAM]?.f || r[COL.PROGRAM]?.v || "Unlabeled";
      const val = Number(r[COL.UNOBLIG_BAL]?.v) || 0;
      programUnobligated[prog] = (programUnobligated[prog] || 0) + val;
    });

    const labels = Object.keys(programUnobligated);
    const data = Object.values(programUnobligated);

    const ctx = unobligatedProgramCanvas.getContext("2d");

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Unobligated (₱)",
            data,
            backgroundColor: CHART_COLORS.singlePurple,
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...CHART_OPTIONS,
        plugins: {
          ...CHART_OPTIONS.plugins,
          legend: { display: false },
          tooltip: {
            ...CHART_OPTIONS.plugins.tooltip,
            callbacks: {
              label: (ctx) => `₱${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            }
          }
        }
      },
    });

    return chart;
  };

  // ========== UNOBLIGATED BALANCES BY ACTIVITY (TEXT) ==========
  const createUnobligatedActivityList = (dataRows, COL) => {
    const activityList = document.getElementById("unobligatedActivityList");
    if (!activityList) return;

    const activities = dataRows
      .map((r) => ({
        activity: r[COL.ACTIVITY]?.f || r[COL.ACTIVITY]?.v || "Unlabeled",
        program: r[COL.PROGRAM]?.f || r[COL.PROGRAM]?.v || "Unlabeled",
        balance: Number(r[COL.UNOBLIG_BAL]?.v) || 0,
      }))
      .filter((a) => a.activity && a.balance > 0)
      .sort((a, b) => b.balance - a.balance); // Descending order

    activityList.innerHTML = "";

    if (activities.length === 0) {
      activityList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i data-feather="check-circle" class="w-12 h-12 mx-auto text-green-500 mb-4"></i>
          <p class="text-lg font-semibold">All funds are obligated</p>
          <p class="text-sm">No unobligated balances found</p>
        </div>
      `;
      replaceIcons();
      return;
    }

    activities.forEach((a) => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200";
      div.innerHTML = `
        <div class="flex-1">
          <div class="font-semibold text-gray-800 text-sm">${escapeHtml(a.activity)}</div>
          <div class="text-xs text-gray-600 mt-1">${escapeHtml(a.program)}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-blue-600 text-sm">₱${a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      `;
      activityList.appendChild(div);
    });
  };

  // ========== INITIALIZE ALL CHARTS ==========
  const initializeCharts = (chartData) => {
    if (typeof Chart === "undefined") {
      console.error("Chart.js failed to load; main charts were not rendered.");
      return;
    }

    const { dataRows, programLabels, programData, programObligationData, COL } = chartData;

    // Destroy existing charts first
    destroyCharts();

    // Create new charts
    const charts = [
      createProgramChart(programLabels, programData),
      createExpenseChart(programLabels, programObligationData),
      createUnobligatedProgramChart(dataRows, COL)
    ];

    // Filter out null charts and add to instances
    chartInstances = charts.filter(chart => chart !== null);

    // Create activity list
    createUnobligatedActivityList(dataRows, COL);

    console.log("Main charts initialized successfully");
  };

  // ========== EVENT HANDLERS ==========

  // Initialize charts when data is ready
  document.addEventListener("dataReady", (e) => {
    initializeCharts(e.detail);
  });
});
