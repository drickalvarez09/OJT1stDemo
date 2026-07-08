// projlogic.js - Projection view logic with fixed flow
document.addEventListener("DOMContentLoaded", function() {
  let isProjectionView = false;

  // Wait for projectionDataReady event
  document.addEventListener("projectionDataReady", (event) => {
    const { dataRows, programLabels, COL } = event.detail;
    const programFilters = document.getElementById("programFilters");
    const toggleProjection = document.getElementById("toggleProjection");
    const mainChartView = document.getElementById("mainChartView");
    const projectionView = document.getElementById("projectionView");
    const tableView = document.getElementById("tableView");

    if (!programFilters) return;

    let currentFilter = "All Programs";

    // ✅ Toggle between main chart and projection views
    if (toggleProjection && mainChartView && projectionView) {
      toggleProjection.addEventListener("click", function () {
        const showingProjection = !projectionView.classList.contains("hidden");
        
        if (showingProjection) {
          // Switch back to main charts
          hideProjectionView();
        } else {
          // Switch to projection view
          showProjectionView();
        }
        
        feather.replace();
      });
    }

    // ✅ Show projection view
    const showProjectionView = () => {
      projectionView.classList.remove("hidden");
      mainChartView.classList.add("hidden");
      
      // Update button
      toggleProjection.innerHTML = '<i data-feather="bar-chart-2" class="w-6 h-6"></i><span>Back to Main View</span>';
      toggleProjection.classList.remove("bg-blue-600", "hover:bg-blue-700");
      toggleProjection.classList.add("bg-green-600", "hover:bg-green-700");
      
      isProjectionView = true;
      
      // Dispatch event for other components
      document.dispatchEvent(new CustomEvent("projectionViewChanged", { 
        detail: { isProjectionView: true } 
      }));
      document.dispatchEvent(new CustomEvent("projectionViewShown"));
    };

    // ✅ Hide projection view
    const hideProjectionView = () => {
      projectionView.classList.add("hidden");
      mainChartView.classList.remove("hidden");
      
      // Update button
      toggleProjection.innerHTML = '<i data-feather="trending-up" class="w-6 h-6"></i><span>Show Per UACS View</span>';
      toggleProjection.classList.remove("bg-green-600", "hover:bg-green-700");
      toggleProjection.classList.add("bg-blue-600", "hover:bg-blue-700");
      
      isProjectionView = false;
      
      // Dispatch event for other components
      document.dispatchEvent(new CustomEvent("projectionViewChanged", { 
        detail: { isProjectionView: false } 
      }));
      document.dispatchEvent(new CustomEvent("projectionViewHidden"));
    };

    // ✅ Handle table view closing to return to correct chart view
    document.addEventListener("tableViewClosed", (event) => {
      const { returnToProjection } = event.detail;
      
      if (returnToProjection && isProjectionView) {
        // Return to projection view
        projectionView.classList.remove("hidden");
        mainChartView.classList.add("hidden");
      } else if (!returnToProjection && !isProjectionView) {
        // Return to main view
        mainChartView.classList.remove("hidden");
        projectionView.classList.add("hidden");
      }
    });

    // ✅ Utility: create filter buttons for projection view
    const renderFilters = () => {
      if (!programFilters) return;
      
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
          
          // Dispatch filter change event for projection charts
          document.dispatchEvent(new CustomEvent("projectionFilterChange", { 
            detail: { filter: currentFilter } 
          }));
        });
      });
    };

    // ✅ Initialize everything
    renderFilters();
    
    // Update icons
    feather.replace();
  });

  // Handle Escape key to close projection view
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isProjectionView) {
      const projectionView = document.getElementById("projectionView");
      const mainChartView = document.getElementById("mainChartView");
      const toggleProjection = document.getElementById("toggleProjection");
      
      if (projectionView && !projectionView.classList.contains("hidden")) {
        // Switch back to main view
        projectionView.classList.add("hidden");
        if (mainChartView) mainChartView.classList.remove("hidden");
        
        // Update button
        if (toggleProjection) {
          toggleProjection.innerHTML = '<i data-feather="trending-up" class="w-6 h-6"></i><span>Show Per UACS View</span>';
          toggleProjection.classList.remove("bg-green-600", "hover:bg-green-700");
          toggleProjection.classList.add("bg-blue-600", "hover:bg-blue-700");
        }
        
        isProjectionView = false;
        
        // Dispatch events
        document.dispatchEvent(new CustomEvent("projectionViewChanged", { 
          detail: { isProjectionView: false } 
        }));
        document.dispatchEvent(new CustomEvent("projectionViewHidden"));
        
        feather.replace();
      }
    }
  });
});