// logic.js - Fixed flow for table view and main chart view
document.addEventListener("DOMContentLoaded", function() {
  let currentFilter = "All Programs";
  let chartData = null;

  // Basic HTML escaping since cell values come from a spreadsheet, not
  // hardcoded markup, and shouldn't be trusted as-is.
  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Wait for dataReady event
  document.addEventListener("dataReady", (event) => {
    chartData = event.detail;
    const { dataRows, programLabels, COL } = chartData;
    
    const tableBody = document.getElementById("budgetTableBody");
    const programFilters = document.getElementById("programFilters");
    const unobligatedActivityList = document.getElementById("unobligatedActivityList");
    const toggleTableView = document.getElementById("toggleTableView");
    const closeTable = document.getElementById("closeTable");
    const tableView = document.getElementById("tableView");
    const mainChartView = document.getElementById("mainChartView");
    const projectionView = document.getElementById("projectionView");

    if (!tableBody || !programFilters) return;

    // ✅ Toggle table view (modal)
    if (toggleTableView && tableView && mainChartView) {
      toggleTableView.addEventListener("click", function () {
        // Hide both chart views and show table modal
        mainChartView.classList.add("hidden");
        if (projectionView) projectionView.classList.add("hidden");
        tableView.classList.remove("hidden");
        
        // Update button text
        toggleTableView.innerHTML = '<i data-feather="pie-chart" class="w-5 h-5"></i><span>Back to Charts</span>';
        feather.replace();
      });
    }

    // ✅ Close table modal and return to appropriate chart view
    if (closeTable && tableView) {
      const closeModal = function () {
        tableView.classList.add("hidden");
        
        // Determine which chart view to show based on projection view state
        const isProjectionViewVisible = projectionView && !projectionView.classList.contains("hidden");
        
        if (isProjectionViewVisible) {
          // Return to projection view
          if (projectionView) projectionView.classList.remove("hidden");
          if (mainChartView) mainChartView.classList.add("hidden");
        } else {
          // Return to main chart view
          if (mainChartView) mainChartView.classList.remove("hidden");
          if (projectionView) projectionView.classList.add("hidden");
        }
        
        // Reset button text
        if (toggleTableView) {
          toggleTableView.innerHTML = '<i data-feather="bar-chart-2" class="w-5 h-5"></i><span>Show Table View</span>';
        }
        feather.replace();
      };

      closeTable.addEventListener("click", closeModal);

      // Also close when clicking outside the modal
      tableView.addEventListener("click", function (e) {
        if (e.target === tableView) {
          closeModal();
        }
      });

      // Close on Escape key
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !tableView.classList.contains("hidden")) {
          closeModal();
        }
      });
    }

    // ✅ Utility: render table rows
    const renderTable = (filter = "All Programs") => {
      if (!tableBody || !chartData) return;
      
      const { dataRows, COL } = chartData;
      tableBody.innerHTML = "";

      const filteredRows = filter === "All Programs"
        ? dataRows
        : dataRows.filter((r) => (r[COL.PROGRAM]?.f || r[COL.PROGRAM]?.v) === filter);

      // Add a small delay to ensure DOM is updated before scroll calculations
      setTimeout(() => {
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
          tableContainer.scrollTop = 0;
        }
      }, 0);

      filteredRows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors duration-200";

        const formatCurrency = (value) => {
          const num = Number(value) || 0;
          return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        const formatPercentage = (value) => {
          let num;
          if (typeof value === 'string') {
            const cleaned = value.replace('%', '').trim();
            num = parseFloat(cleaned) || 0;
          } else {
            num = Number(value) || 0;
          }
          return `${num.toFixed(2)}%`;
        };

        // Per the original spec: blank cells show "Empty" in bold rather
        // than being left blank, so a missing value is never ambiguous
        // with a real zero.
        const textCell = (col) => {
          const val = r[col]?.f || r[col]?.v;
          return val ? escapeHtml(String(val)) : "<span class='font-bold text-gray-400'>Empty</span>";
        };
        const numericCell = (col, formatter) => {
          const raw = r[col]?.v;
          return raw === "" || raw === undefined || raw === null
            ? "<span class='font-bold text-gray-400'>Empty</span>"
            : formatter(raw);
        };

        tr.innerHTML = `
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(COL.COMPONENT_PROGRAM)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(COL.PROGRAM)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(COL.ACTIVITY)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(COL.PARTICULAR_DESC)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(COL.SUBARO)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-green-600 border-r border-gray-100">
            ${numericCell(COL.ALLOC, formatCurrency)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-blue-600 border-r border-gray-100">
            ${numericCell(COL.OBLIG, formatCurrency)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-orange-600 border-r border-gray-100">
            ${numericCell(COL.BUR, formatPercentage)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-red-600">
            ${numericCell(COL.UNOBLIG_BAL, formatCurrency)}
          </td>
        `;

        tableBody.appendChild(tr);
      });

      // Update row count
      const rowCountEl = document.getElementById("rowCount");
      if (rowCountEl) {
        rowCountEl.textContent = `${filteredRows.length} record${filteredRows.length !== 1 ? 's' : ''} ${filter !== "All Programs" ? `in ${filter}` : ''}`;
      }
      
      // Update icons
      feather.replace();
    };

    // ✅ Utility: create filter buttons
    const renderFilters = () => {
      if (!programFilters || !chartData) return;
      
      const { programLabels } = chartData;
      programFilters.innerHTML = "";

      const allBtn = document.createElement("button");
      allBtn.innerText = "All Programs";
      allBtn.className = "program-chip px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium transition duration-200 shadow-sm";
      allBtn.dataset.program = "All Programs";
      programFilters.appendChild(allBtn);

      const sortedLabels = [...programLabels].sort((a, b) => a.localeCompare(b));

      sortedLabels.forEach((p) => {
        const btn = document.createElement("button");
        btn.innerText = p;
        btn.className = "program-chip px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium transition duration-200 shadow-sm hover:bg-blue-50";
        btn.dataset.program = p;
        programFilters.appendChild(btn);
      });

      // Interactivity
      programFilters.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentFilter = btn.dataset.program;
          programFilters.querySelectorAll("button").forEach((b) => {
            b.classList.remove("bg-blue-600", "text-white");
            b.classList.add("bg-white", "text-gray-700", "border", "border-gray-300");
          });
          btn.classList.remove("bg-white", "text-gray-700", "border", "border-gray-300");
          btn.classList.add("bg-blue-600", "text-white");
          renderTable(currentFilter);
        });
      });
    };

    // ✅ Initialize everything
    renderFilters();
    renderTable(currentFilter);
    
    // Update icons
    feather.replace();
  });

  // Handle projection view changes to update table button state
  document.addEventListener("projectionViewChanged", (event) => {
    const { isProjectionView } = event.detail;
    const toggleTableView = document.getElementById("toggleTableView");
    
    if (toggleTableView) {
      if (isProjectionView) {
        // In projection view - update button if needed
        toggleTableView.innerHTML = '<i data-feather="bar-chart-2" class="w-5 h-5"></i><span>Show Table View</span>';
      } else {
        // In main view - ensure correct button state
        toggleTableView.innerHTML = '<i data-feather="bar-chart-2" class="w-5 h-5"></i><span>Show Table View</span>';
      }
      feather.replace();
    }
  });
});