# Formula 1 Track Map Visualization

## Project Overview

This project creates an interactive Formula 1 race track visualization that allows users to explore races across different seasons on a world map. Users can select seasons, view race locations, and click on race markers to see detailed race information including podium results, fastest laps, and championship standings, view and compare individual driver/constructor performance, gain insights on the tyres and engine manufactures performance too, along with a sustainability score for the engines.

## Project Structure

### Main Files

- `index.html` - Main entry point containing the visualization containers and UI elements
- `README.md` - Project documentation

### Assets

- `assets/images/tyre.png` & `tyre.svg` - Tyre images used in visualizations
- `assets/font/` - Formula 1 custom fonts used throughout the application
- `assets/data/` - CSV and GeoJSON data files (datasets will be removed for the canvas submission; link to oneDrive with datasets: <https://heriotwatt-my.sharepoint.com/:f:/g/personal/avg2000_hw_ac_uk/Eth2HT3b305CmE6Thj_j_BgBmLN8ZYOoZ6XDlMinK80WrA?e=qLOy14>)
- `assets/data/f1-car.png` - Car image used in racing bar chart visualization

### Scripts

- `scripts/main.js` - Main initialization script
- `scripts/visualizations/track-map/` - Track map visualization components
  - Track map for displaying races on a world map
  - Components for race details (podium, fastest lap, standings)
  - `scripts/visualizations/constructors/`  
    - Contains the constructors visualization components:
      - `bubble-chart-constructors.js` - Renders a bubble chart comparing constructors by a selected metric  
      - `line-chart-constructors.js` - Plots constructor performance over time with multiple metric options  
      - `constructors.js` - Loads, aggregates, and initializes the constructors data and visualizations  
      - `selectionManager.js` - Manages a shared selection state (constructor IDs) for synchronizing updates across visualizations
- `scripts/visualizations/drivers/`
  - Contains 2 drivers visualization components:
         - `drivers-bar.js` – Renders the racing bar chart of top 10 drivers.
         - `line_chart.js` – Renders the final drivers line chart with multiple driver and metric selection options.
         - `championshipPoints.js` – Computes and prepares data for driver championship points over the seasons.
         - `championshipPos.js` – Extracts and formats the data related to each driver's final championship standing per season.
         - `championshipWins.js` – Calculates total championship wins per driver across all seasons.
         - `metric.js` – Acts as a central configuration file that defines available metrics and their mappings to respective files.
         - `podiums.js` – Computes and returns podium (top 3) finish counts per driver over time.
         - `polePositions.js` – Extracts data on number of pole positions achieved by each driver.
         - `raceWins.js` – Calculates race win counts per driver across seasons.

- `scripts/visualizations/engine/` - Engine visualization components
  - Bar Chart for displaying Top 5 Engine Manufacturers based on TotalRaceWins
  - Bar-Bar Chart for displaying Top 5 Engine Manufacturers based on overall sustainability score calculated via configuration, capacity and aspiration
- `scripts/visualizations/tyres/` - Tyre visualization components
  - Donut chart for ranking all tyre manufacturers based on totalRaceWins, pole positions and, fastest laps

### Styles

- `styles/main.css` - Global styles and drivers specific also present here
- `styles/visualizations/track-map.css` - Styles specific to the track map visualization
- `styles/visualizations/constructors.css` - Styles specific to the constructors visualization
- `styles/visualizations/engine.css` - Styles specific to the engine visualization
- `styles/visualizations/tyre.css` - Styles specific to the tyre visualization

## Track Map Visualization Components

The track map section consists of several interrelated components:

1. **World Map Visualization** (`track-map.js`)
   - Renders a world map with highlighted countries hosting F1 races for the chosen year
   - For the map, geoJson file was downloaded from here: <https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson>
   - Displays race round numbers as interactive markers over the higlighted countries indicating the order of the races taken place that year
   - Implements zoom/pan controls and tooltips
   - Handles season selection and triggers race detail views

2. **Race Details Components**
   - `constructor-standings.js` - Donut chart showing constructor points for the race
   - `driver-standings.js` - Bar chart showing driver championship standings for the race
   - `fastest-lap.js` - Animated visualization of fastest lap data
   - `podium-histogram.js` - Bar chart showing top 3 finishers with animations and confetti effect

## How It Works

1. User selects a season from the dropdown
2. The map displays race locations (highlighted) with numbers as markers over them indicating the order of races
3. Hovering over a country shows a tooltip with the tracks in the country and its details.Hovering over a marker shows specific track information
4. Clicking on a race marker loads detailed race visualizations:
   - Podium results with animation
   - Fastest lap visualization with race car animation
   - Driver and constructor standings

# Drivers Visualization Components

The drivers section consists of two independent visualizations that highlight individual driver performances and achievements:

1. **Racing Bar Chart** (`drivers/drivers-bar.js`)
   - Represents the top 10 drivers of all time based on the number of championship wins.
   - The chart uses color coding to represent the number of wins (e.g., drivers with 4 wins are colored blue), making it easy to interpret at a glance.
   - A dotted line is drawn corresponding to each driver's win count for added clarity.
   - Visually engaging and animated to emphasize ranking transitions and driver highlights.

2. **Driver Statistics & Performance Line Chart** ('drivers/line_chart.js')
   - Displays performance trends of selected drivers over time based on a chosen metric.
   - Metrics include Race Wins, Podiums, Pole Positions, and more.
   - Users can select up to 6 drivers from the dropdown to compare simultaneously.
   - When the metric or selected drivers are changed, the chart updates with smooth transitions.
   - Each selected driver is represented with a distinct color, and their names appear on the right side of the chart for easy identification.
   - Dynamic tooltips enhance interactivity by showing the driver name, year, and metric value for each data point.

### How It Works

1. Users choose a metric from the dropdown (e.g., Podiums or Pole Positions).
2. They select up to 6 drivers from the driver dropdown.
3. The line chart updates to reflect the selected drivers' performance over the years based on the selected metric.
4. Each driver is shown with a unique color, and tooltips update dynamically to show detailed information for each point.

## Constructors Visualization Components

The constructors section consists of two interrelated visualizations that work together to provide insights into constructor performance:

1. **Bubble Chart Visualization** (`bubble-chart-constructors.js`)
   - Displays a bubble chart where each bubble represents a constructor.
   - Bubble size is proportional to a chosen metric (e.g., race wins, championships, total points), allowing for easy comparison between constructors.
   - A tooltip shows additional information about each constructor, including full name, country, and the current metric value.
   - The chart uses D3’s force simulation for dynamic bubble positioning and supports bidirectional interactions with the line chart.

2. **Line Chart Visualization** (`line-chart-constructors.js`)
   - Plots the performance of constructors over time.
   - Offers multiple metric options, including points, championship positions, race wins, podiums, and pole positions.
   - Aggregates data from both season standings and race results to compute the additional metrics.
   - The tooltip dynamically updates to display only the currently selected metric and its value for each data point.
   - Bidirectional linking is implemented: selections made in the bubble chart update the line chart and vice versa.

### How It Works

1. The user selects a metric from the dropdown (e.g., Race Wins, Podiums, or Pole Positions) in the line chart.
2. The bubble chart displays constructors with bubble sizes proportional to the chosen metric, and the line chart plots the performance of the selected constructors over time.
3. When the user clicks on a bubble or selects a constructor from the dropdown, both charts update simultaneously, ensuring the chosen constructor’s data is highlighted across visualizations.
4. Tooltips in both charts update dynamically to show only the current metric’s label and value, enhancing clarity and interactivity.

### Additional Scripts

This section covers additional core scripts that support the overall visualizations:

1. **constructors.js**
   - **Purpose:**  
     Loads and aggregates data for the constructors visualizations.  
   - **Key Functions:**  
     - Loads constructor and season standings CSV data, converting necessary fields to numbers.
     - Loads and aggregates race results data to calculate additional metrics such as race wins, podiums, and pole positions.
     - Sets up the dashboard container with two sections: one for the bubble chart and one for the line chart.
     - Passes the aggregated data to the respective visualization initialization functions.

2. **selectionManager.js**
   - **Purpose:**  
     Manages a shared selection state (an array of constructor IDs) across visualizations.
   - **Key Functions:**  
     - Provides methods to set, add, remove, and toggle selections.
     - Supports subscribing and unsubscribing to selection changes, notifying all listeners whenever the selection state is updated.

## Engine Visualization Components

The engine section consists of several interrelated components:

1. **Top Engine Manufacturers Bar Chart**
   - Displays a bar chart ranking the top 5 engine manufacturers based on either total race wins or sustainability score.
   - Implements interactive metric selection, allowing users to toggle between ranking by Race Wins or Sustainability Score.
   - Updates dynamically when switching metrics, ensuring **correct sorting and X-axis updates.
   - Features smooth animations, where bars grow from the bottom upward.

2. **Sustainability Breakdown Bar Chart
   - Stacked bar chart showing three key sustainability factors:
     - Capacity score
     - Configuration score
     - Aspiration score
   - Highlights an outlined bar overlay for the final sustainability score of each manufacturer.
   - Implements an interactive legend to explain the significance of sustainability metrics.
   - Transition animations ensure smooth updates when toggling between metrics.

3. **Chart Update & Animation Handler**
   - Handles chart updates when switching between Race Wins and Sustainability Score.
   - Uses Intersection Observer  to restart animations when users scroll into view.
   - Dynamically updates the X and Y axes based on the selected metric.
   - Ensures smooth hover interactions for better user experience.

## How It Works

1. User selects an engine performance metric (Total Race Wins or Sustainability Score) from the dropdown.
2. The bar chart updates dynamically, ranking the top five engine manufacturers based on the selected metric.
3. When switching to Sustainability Score, bars are grouped to show capacity, configuration, and aspiration scores.
4. The overall sustainability score is outlined with a distinct stroke for clarity.
6. The visualization restarts whenever the user scrolls back into view, ensuring a smooth experience.

## Tyre Visualization Components

The tyre section consists of several interrelated components:

1. Tyre Manufacturer Donut Chart
   - Displays a donut chart showing tyre manufacturers' performance metrics such as total race wins, pole positions, and fastest laps.
   - Features smooth sequential animation, where each segment is revealed one by one in a circular motion.
   - Implements tooltip interactions, displaying manufacturer name, country, and selected metric value.
   - Uses a color-coded scheme for easy differentiation of tyre manufacturers.

2. Tyre Manufacturer Tooltip
   - Appends an interactive tooltip to the body, ensuring proper positioning across screen sizes.
   - Dynamically updates tooltip background color based on the hovered tyre segment.
   - Ensures a consistent hover effect, preventing flickering issues.
   - Displays manufacturer details with bold emphasis on the name and subtle text styling for other information.

3. Animation & Scroll Interaction
   - Uses Intersection Observer API to restart animations when users scroll into view.
   - Ensures bars and pie segments grow sequentially, improving user experience.
   - Handles smooth metric transitions, ensuring the correct dataset is displayed when switching metrics.

## How It Works

1. User selects a performance metric (Race Wins, Pole Positions, or Fastest Laps) from the dropdown.
2. The donut chart updates dynamically, ranking tyre manufacturers based on the selected metric.
3. Each segment is revealed sequentially in a circular motion for a smooth transition.
4. Hovering over a segment displays a tooltip with the manufacturer name, country, and metric value.
5. The tooltip's background color matches the segment color for easy identification.
6. Scrolling into view triggers the animation, restarting the visualization when revisited.

All visualizations are created using D3.js and feature smooth animations, interactive elements, and responsive design to provide an engaging user experience.

## Dependencies

- D3.js v7 (`libs/d3/d3.v7.min.js`) - For data visualization
- Formula 1 custom fonts - For authentic F1 typography

## Future Improvements

- Add circuit layout visualizations
- Implement race comparison features
- Add historical trends analysis
- Integrate with live F1 data API for real-time updates
