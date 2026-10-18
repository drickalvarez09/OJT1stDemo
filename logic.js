// logic.js - Fixed flow for table view and main chart view
document.addEventListener("DOMContentLoaded", function() {
  let currentFilter = "All Programs";
  let chartData = null;

  // Wait for dataReady event
  document.addEventListener("dataReady", (event) => {
    chartData = event.detail;

    const tableBody = document.getElementById("budgetTableBody");
    const programFilters = document.getElementById("programFilters");
    const toggleTableView = document.getElementById("toggleTableView");
    const closeTable = document.getElementById("closeTable");
    const tableView = document.getElementById("tableView");
    const mainChartView = document.getElementById("mainChartView");
    const projectionView = document.getElementById("projectionView");

    if (!tableBody || !programFilters) return;

    // ✅ Toggle table view (modal)
    let tableOpen = false;
    let returnToProjection = false;

    const setTableOpen = (open) => {
      if (!tableView) return;

      if (open) {
        returnToProjection = !!(projectionView && !projectionView.classList.contains("hidden"));
        tableOpen = true;

        // Hide both chart views and show table modal
        if (mainChartView) mainChartView.classList.add("hidden");
        if (projectionView) projectionView.classList.add("hidden");
        tableView.classList.remove("hidden");
        tableView.setAttribute("aria-hidden", "false");

        if (toggleTableView) {
          toggleTableView.setAttribute("aria-expanded", "true");
          toggleTableView.innerHTML = '<i data-feather="pie-chart" class="w-5 h-5"></i><span>Back to Charts</span>';
        }

        const appShell = document.getElementById("appShell");
        if (appShell) {
          appShell.inert = true;
          appShell.setAttribute("aria-hidden", "true");
        }

        if (closeTable) closeTable.focus();
      } else {
        tableOpen = false;
        tableView.classList.add("hidden");
        tableView.setAttribute("aria-hidden", "true");

        // Return to whichever chart view was open before the modal
        if (returnToProjection) {
          if (projectionView) projectionView.classList.remove("hidden");
          if (mainChartView) mainChartView.classList.add("hidden");
        } else {
          if (mainChartView) mainChartView.classList.remove("hidden");
          if (projectionView) projectionView.classList.add("hidden");
        }

        const appShell = document.getElementById("appShell");
        if (appShell) {
          appShell.inert = false;
          appShell.removeAttribute("aria-hidden");
        }

        if (toggleTableView) {
          toggleTableView.setAttribute("aria-expanded", "false");
          toggleTableView.innerHTML = '<i data-feather="bar-chart-2" class="w-5 h-5"></i><span>Show Table View</span>';
          toggleTableView.focus();
        }

        document.dispatchEvent(new CustomEvent("tableViewClosed", { detail: { returnToProjection } }));
      }

      replaceIcons();
    };

    if (toggleTableView && tableView) {
      toggleTableView.addEventListener("click", function () {
        setTableOpen(!tableOpen);
      });
    }

    if (closeTable && tableView) {
      closeTable.addEventListener("click", () => setTableOpen(false));

      // Also close when clicking outside the modal
      tableView.addEventListener("click", function (e) {
        if (e.target === tableView) setTableOpen(false);
      });

      // Close on Escape key
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !tableView.classList.contains("hidden")) {
          setTableOpen(false);
        }
      });

      // Keep keyboard focus inside the dialog while it is open
      tableView.addEventListener("keydown", function (e) {
        if (e.key !== "Tab") return;
        const focusable = tableView.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
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

      // Per the original spec: blank cells show "Empty" in bold rather
      // than being left blank, so a missing value is never ambiguous
      // with a real zero.
      const textCell = (row, col) => {
        const val = row[col]?.f || row[col]?.v;
        return val ? escapeHtml(String(val)) : "<span class='font-bold text-gray-400'>Empty</span>";
      };
      const numericCell = (row, col, formatter) => {
        const raw = row[col]?.v;
        return raw === "" || raw === undefined || raw === null
          ? "<span class='font-bold text-gray-400'>Empty</span>"
          : formatter(raw);
      };

      filteredRows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 transition-colors duration-200";

        tr.innerHTML = `
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(r, COL.COMPONENT_PROGRAM)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(r, COL.PROGRAM)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(r, COL.ACTIVITY)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(r, COL.PARTICULAR_DESC)}
          </td>
          <td class="px-6 py-4 text-left whitespace-nowrap text-gray-700 border-r border-gray-100">
            ${textCell(r, COL.SUBARO)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-green-600 border-r border-gray-100">
            ${numericCell(r, COL.ALLOC, formatCurrency)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-blue-600 border-r border-gray-100">
            ${numericCell(r, COL.OBLIG, formatCurrency)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-orange-600 border-r border-gray-100">
            ${numericCell(r, COL.BUR, formatPercentage)}
          </td>
          <td class="px-6 py-4 text-right whitespace-nowrap font-semibold text-red-600">
            ${numericCell(r, COL.UNOBLIG_BAL, formatCurrency)}
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
      replaceIcons();
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
    replaceIcons();
  });

  // Keep the table button's state in sync when the chart view changes
  document.addEventListener("projectionViewChanged", () => {
    const toggleTableView = document.getElementById("toggleTableView");

    if (toggleTableView) {
      toggleTableView.innerHTML = '<i data-feather="bar-chart-2" class="w-5 h-5"></i><span>Show Table View</span>';
      replaceIcons();
    }
  });
});
