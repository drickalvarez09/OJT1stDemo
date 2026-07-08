// projcharts.js - Add proper reinitialization logic
document.addEventListener("DOMContentLoaded", function() {
  let projectionChartInstances = [];
  let projectionData = null; // Store projection data

  // Add the missing parsePercentage function
  const parsePercentage = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove % symbol and any whitespace, then convert to number
      const cleaned = value.replace('%', '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Helper function to destroy existing charts
  const destroyProjectionCharts = () => {
    projectionChartInstances.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    projectionChartInstances = [];
  };


  // Store projection data when ready
  document.addEventListener("projectionDataReady", (e) => {
    projectionData = e.detail;
    initializeProjectionCharts(projectionData);
  });

  // Initialize all projection charts
  const initializeProjectionCharts = (data) => {
    if (!data) return;
    
    const { dataRows, programLabels, programData, COL, totals, objectTotals } = data;
    destroyProjectionCharts(); // Clear existing charts first

    // Colors for projection charts
    const donutColors = [
      'rgba(59, 130, 246, 0.8)',   // blue-500
      'rgba(37, 99, 235, 0.8)',    // blue-600
      'rgba(29, 78, 216, 0.8)',    // blue-700
      'rgba(30, 64, 175, 0.8)',    // blue-800
      'rgba(23, 37, 84, 0.8)',     // blue-900
      'rgba(96, 165, 250, 0.8)',   // blue-400
      'rgba(147, 197, 253, 0.8)',  // blue-300
      'rgba(191, 219, 254, 0.8)',  // blue-200
    ];

    const singleBlue = 'rgba(59, 130, 246, 0.8)';
    const singlePurple = 'rgba(165, 44, 230, 0.98)';
    const singleGreen = 'rgba(34, 197, 94, 0.8)';

    // ========== ALLOCATION BY OBJECT CODE ==========
    const projectedProgramCanvas = document.getElementById("projectedProgramChart");
    if (projectedProgramCanvas) {
      const ctx = projectedProgramCanvas.getContext("2d");

      const objectAllocation = data.objectTotals?.allocation || {};
      const objectLabels = Object.keys(objectAllocation);
      const objectData = Object.values(objectAllocation);

      const chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: objectLabels,
          datasets: [
            {
              label: "Allocation (₱)",
              data: objectData,
              backgroundColor: singleGreen,
              borderColor: 'rgba(34, 197, 94, 1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#374151',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `₱${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              }
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
              ticks: { 
                color: '#374151',
                maxRotation: 45,
                minRotation: 45
              } 
            },
          },
        },
      });
      projectionChartInstances.push(chart);
    }

    // ========== OBLIGATION DISTRIBUTION BY OBJECT CODE ==========
    const projectedExpenseCanvas = document.getElementById("projectedExpenseChart");
    if (projectedExpenseCanvas) {
      const ctx = projectedExpenseCanvas.getContext("2d");

      const objectObligation = data.objectTotals?.obligation || {};
      const labels = Object.keys(objectObligation);
      const chartValues = Object.values(objectObligation);

      const chart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Obligation (₱)",
              data: chartValues,
              backgroundColor: donutColors,
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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#374151',
              borderColor: '#e5e7eb',
              borderWidth: 1,
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
      projectionChartInstances.push(chart);
    }

    // ========== UNOBLIGATED BALANCES BY OBJECT CODE ==========
    const projectedUnobligatedCanvas = document.getElementById("projectedUnobligatedChart");
    if (projectedUnobligatedCanvas) {
      const ctx = projectedUnobligatedCanvas.getContext("2d");

      const objectUnobligated = data.objectTotals?.unobligated || {};
      const labels = Object.keys(objectUnobligated);
      const chartValues = Object.values(objectUnobligated);

      const chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Unobligated (₱)",
              data: chartValues,
              backgroundColor: singlePurple,
              borderColor: 'rgba(139, 92, 246, 1)',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#374151',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `₱${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              }
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
              ticks: { 
                color: '#374151',
                maxRotation: 45,
                minRotation: 45
              } 
            },
          },
        },
      });
      projectionChartInstances.push(chart);
    }

    // ========== BUR RATES BY OBJECT CODE ==========
    const projectedBURList = document.getElementById("projectedBURList");
    if (projectedBURList) {
      const rows = dataRows
        .map((r) => ({
          object: r[COL.OBJECT_NAME]?.f || r[COL.OBJECT_NAME]?.v || "Unlabeled",
          activity: r[COL.ACTIVITY]?.f || r[COL.ACTIVITY]?.v || "Unlabeled",
          program: r[COL.PROGRAM]?.f || r[COL.PROGRAM]?.v || "Unlabeled",
          bur: parsePercentage(r[COL.BUR]?.v) || 0,
          allocation: Number(r[COL.ALLOC]?.v) || 0,
        }))
        .filter((a) => a.object)
        .sort((a, b) => b.bur - a.bur);

      projectedBURList.innerHTML = "";

      rows.forEach((a) => {
        const div = document.createElement("div");
        div.className = "flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200";
        div.innerHTML = `
          <div class="flex-1">
            <div class="font-semibold text-gray-800 text-sm">${a.object}</div>
            <div class="text-xs text-gray-600 mt-1">${a.activity}</div>
            <div class="text-xs text-gray-500 mt-1">${a.program} · Allocation: ₱${a.allocation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="text-right">
            <div class="font-bold ${a.bur >= 80 ? 'text-green-600' : a.bur >= 50 ? 'text-orange-600' : 'text-red-600'} text-sm">
              ${a.bur.toFixed(2)}%
            </div>
            <div class="text-xs text-gray-500 mt-1">BUR</div>
          </div>
        `;
        projectedBURList.appendChild(div);
      });

      if (rows.length === 0) {
        projectedBURList.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            <i data-feather="alert-circle" class="w-12 h-12 mx-auto text-gray-400 mb-4"></i>
            <p class="text-lg font-semibold">No Per UACS data available</p>
            <p class="text-sm">BUR rates by object code will appear here once loaded</p>
          </div>
        `;
        feather.replace();
      }
    }

    console.log("Projection charts initialized successfully");
  };

  // Clean up charts when projection view is hidden
  document.addEventListener("projectionViewHidden", () => {
    destroyProjectionCharts();
  });

  // Reinitialize charts when projection view is shown
  document.addEventListener("projectionViewShown", () => {
    if (projectionData) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeProjectionCharts(projectionData);
      }, 100);
    }
  });

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      projectionChartInstances.forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
    }, 250);
  });
});