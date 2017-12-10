//Queue performs series of asynchronous tasks
//In this case, loading multiple JSON files, then trying to make graphs
queue()
//.defer(d3.json, "/explore/data")
.defer(d3.json, "/static/scripts/data_viz_limited.json")
.defer(d3.json, "/static/scripts/vendor/us-states.json")
.await(makeGraphs);


function makeGraphs(error, data, statesJson) {
	//if (error) throw error;
	console.log(data);

  // Crossfilter instance
  var cf = crossfilter(data);

  //Define Dimensions
  var industryDim = cf.dimension(function(d) { return d["Industry"]; });
  var repTypeDim = cf.dimension(function(d) { return d["Rep_Type"]; });
  var partyDim = cf.dimension(function(d) { return d["Party"]; });
  var stateDim = cf.dimension(function(d) { return d["State"]; });
  
  //Calculate metrics
  var totalDonationsByIndustry = industryDim.group().reduceSum(function(d) {
    return d["Total"];
  }); 
  var totalDonationsByType = repTypeDim.group().reduceSum(function(d) {
    return d["Total"];
  }); 
  var totalDonationsByParty = partyDim.group().reduceSum(function(d) {
    return d["Total"];
  }); 
  var totalDonationsByState = stateDim.group().reduceSum(function(d) {
    return d["Total"];
  }); 
  //Custom average value reduce formulas
  var averageDwByState = stateDim.group().reduce(
    //add
    function(p,v){
    p.count++;
    p.sum += v['DW_Nominate'];
    p.avg = d3.round((p.sum/p.count),2);
    return p;
    },
    //remove
    function(p,v){
    p.count--;
    p.sum -= v['DW_Nominate'];
    p.avg = d3.round((p.sum/p.count),2);
    return p;
    },
    //init
    function(p,v){
       return {count:0,avg:0,sum:0};
    }
  );
  
  //Charts
  var mapChart = dc.geoChoroplethChart("#map-chart");
  var repChart = dc.pieChart("#rep-chart");
  var partyChart = dc.pieChart("#party-chart");
  var industryChart = dc.rowChart("#industry-chart");

  //Chart Specifications
  mapChart.width(800)
    .height(400)
    .dimension(stateDim)
    .group(averageDwByState)
    .valueAccessor(function (p) {
    return p.value.avg;
    })
    .colors(["#2166ac","#4393c3","#92c5de","#d1e5f0","#f7f7f7","#fddbc7","#f4a582","#d6604d","#d6604d"])
    .colorDomain([-0.4, 0.6])
    .legend(dc.legend())
    .overlayGeoJson(statesJson["features"], "state", function (d) {
      return d.properties.name;
    })
    .projection(d3.geo.albersUsa()
            .scale(600)
            .translate([340, 150]))
    .title(function (p) {
      return "State: " + p["key"]
          + "\n"
          + "DW Nominate Score: " + p.value;
    });


  repChart
    .width(250)
    .height(250)
    .dimension(repTypeDim)
    .group(totalDonationsByType)
    .legend(dc.legend())
    .label(function(d) {
      return d.data.key + ' ' + Math.round((d.endAngle - d.startAngle) / Math.PI * 50) + '%';
    });

  var colorScale = d3.scale.ordinal()
   .domain(["Democrat", "Republican"])
   .range(["#1357c4", "#9b1511"]);

  partyChart
    .width(250)
    .height(250)
    .dimension(partyDim)
    .group(totalDonationsByParty)
    //.colors(function(d){ return colorScale(d.data.key); })
    .legend(dc.legend())
    .label(function(d) {
      return d.data.key + ' ' + Math.round((d.endAngle - d.startAngle) / Math.PI * 50) + '%';
    });

  industryChart
    .width(500)
    .height(700)
    .margins({top: 10, right: 50, bottom: 30, left: 50})
    .dimension(industryDim)
    .group(totalDonationsByIndustry)
    .xAxis()
    .ticks(5)
    .tickFormat( function (v) {
      return "$" + Math.round(v / 1000000) + 'M'; 
    });

  dc.renderAll();
};
