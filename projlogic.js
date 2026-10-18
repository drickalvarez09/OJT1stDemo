// projlogic.js - Per UACS view logic
document.addEventListener("DOMContentLoaded", function() {
  let isProjectionView = false;

  // Wait for projectionDataReady event
  document.addEventListener("projectionDataReady", function () {
    const toggleProjection = document.getElementById("toggleProjection");
    const mainChartView = document.getElementById("mainChartView");
    const projectionView = document.getElementById("projectionView");

    if (!toggleProjection || !mainChartView || !projectionView) return;

    // ✅ Show projection view
    const showProjectionView = () => {
      projectionView.classList.remove("hidden");
      mainChartView.classList.add("hidden");

      // Update button
      toggleProjection.setAttribute("aria-expanded", "true");
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
      toggleProjection.setAttribute("aria-expanded", "false");
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

    // ✅ Toggle between main chart and projection views
    toggleProjection.addEventListener("click", function () {
      if (!projectionView.classList.contains("hidden")) {
        hideProjectionView();
      } else {
        showProjectionView();
      }

      replaceIcons();
    });

    // ✅ Keep the view in sync when the table modal closes
    document.addEventListener("tableViewClosed", function (event) {
      const { returnToProjection } = event.detail;

      if (returnToProjection) {
        projectionView.classList.remove("hidden");
        mainChartView.classList.add("hidden");
      } else {
        mainChartView.classList.remove("hidden");
        projectionView.classList.add("hidden");
      }
    });

    // Update icons
    replaceIcons();
  });

  // Handle Escape key to close projection view (unless the table modal is open)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !isProjectionView) return;

    const tableView = document.getElementById("tableView");
    if (tableView && !tableView.classList.contains("hidden")) return;

    const projectionView = document.getElementById("projectionView");
    const mainChartView = document.getElementById("mainChartView");
    const toggleProjection = document.getElementById("toggleProjection");

    if (!projectionView || projectionView.classList.contains("hidden")) return;

    // Switch back to main view
    projectionView.classList.add("hidden");
    if (mainChartView) mainChartView.classList.remove("hidden");

    // Update button
    if (toggleProjection) {
      toggleProjection.setAttribute("aria-expanded", "false");
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

    replaceIcons();
  });
});
