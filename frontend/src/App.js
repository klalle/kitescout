import './App.css';

import axios from 'axios';

import 'chartjs-adapter-moment';

import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import {
  TimeScale, //Import timescale instead of CategoryScale for X axis
  //CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart as ChartJS } from 'chart.js';
import { Line, Chart } from 'react-chartjs-2';
import React, { useState, useEffect } from 'react';

ChartJS.register(
  zoomPlugin,
  annotationPlugin,

  TimeScale, //Import timescale instead of CategoryScale for X axis
  //CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler
)


function App() {

  // const variableLineColor = {
  //   id: "variableLineColor",
  //   afterDraw: (chart, args, options) => {
  //     setMiddleX((chart.scales['x']._userMax-chart.scales['x']._userMin)/2+chart.scales['x']._userMin);
  //   }
  // };

  // ChartJS.register(variableLineColor);

  const [chartData, setChartData] = useState({ datasets: [] });
  //const [chartOptions, setChartOptions] = useState({});
  const [sgv, setSgv] = useState();
  const [tempBasal, setTempBasal] = useState();
  const [basal, setBasal] = useState();
  const [profile, setProfile] = useState();
  var localserver = "";
  if (process.env.REACT_APP_LOCALSERVER) localserver = "http://localhost:5000";

  const highThresh = 10;
  const lowThresh = 3.5;
  var minDateShown = ChartJS.chart;

  useEffect(() => {
    setData();
  }, [tempBasal]);

  useEffect(async () => {
    await getData();
  }, []);

  const nrToGet = 200;

  const getData = async (toDate = new Date()) => {

    try {
      let fromDate = new Date(toDate.getTime());
      fromDate.setDate(fromDate.getDate() - 1);
      var res = await axios.get(localserver + "/getsgv", { params: { datefrom: fromDate.toISOString(), dateto: toDate.toISOString() } });
      let s = res.data.map(s => (({ dateString, sgv }) => ({ x: dateString, bg: sgv / 18 }))(s));
      setSgv(s);

      res = await axios.get(localserver + "/getprofiles", { params: { datefrom: fromDate.toISOString(), dateto: toDate.toISOString() } });
      let p = res.data.map(s => (({ created_at, duration, profile, profileJson }) => ({ x: created_at, duration: duration, profileName: profile, profileJson: JSON.parse(profileJson) }))(s));
      setProfile(p);

      res = await axios.get(localserver + "/gettempbasal", { params: { datefrom: fromDate.toISOString(), dateto: toDate.toISOString() } });
      let b = res.data.map(s => (({ created_at, durationInMilliseconds, rate }) => ({ x: created_at, duration: durationInMilliseconds, basal: rate }))(s));
      setTempBasal(b);



    } catch (e) {
      console.log(e);
    }
  };

  const RGB_red = 'rgb(255,0,0)';
  const RGB_green = 'rgb(0,255,0)';
  const RGB_gray = 'rgb(128,128,128)';

  function setData() {
    if (!sgv) return;
    let bg = [];
    sgv?.forEach((e, index) => {
      //if (index < 500) {
      bg.push([
        new Date(e.x),
        e.bg
      ])
      // }
    });
    let firstBGtime = bg[bg.length - 1][0].getTime();
    let lastBGtime = bg[0][0].getTime();

    let basProf = [];
    let realProfiles = profile.filter(e => e.duration == 0);
    var lastProfileStartTime = new Date(); //~lastBGtime
    var lastProfileStartVal = null;

    const datesAreOnSameDay = (first, second) =>
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();

    const getHpart = (t) => t.split(":")[0];
    const getMpart = (t) => t.split(":")[1];

    function returnDateWithHHMM(date, timeStrHHMM) {
      return new Date(date)
        .setHours(getHpart(timeStrHHMM), getMpart(timeStrHHMM), 0, 0);
    }

    var lastVal = null;
    realProfiles.forEach((e, index) => {
      var currTime = lastProfileStartTime;
      let eProfile = e.profileJson.basal.reverse(); //reverses the array inplace as well!
      let startProfileDate = new Date(e.x);
      while (currTime >= startProfileDate) {
        eProfile.forEach((b) => {
          let bTime = returnDateWithHHMM(currTime, b.time);
          if (bTime >= startProfileDate
            && bTime < new Date().setTime(new Date().getTime() + 2 * 3600 * 1000)
            && bTime > new Date().setTime(firstBGtime - 5 * 3600 * 1000)) {
            if (lastVal) {
              basProf.push([
                bTime,
                lastVal
              ])
            }
            basProf.push([
              bTime,
              b.value
            ])
            lastVal = b.value;
          }
        });
        currTime.setDate(currTime.getDate() - 1);
      }
    });

    let tempBasProf = [];

    lastProfileStartTime = new Date(); //set to midnight today
    const tempProf = profile.filter(e => e.duration > 0);
    tempProf.forEach((e) => {
      let eProfile = e.profileJson.basal.reverse(); //reverses the array inplace as well!
      let durationms = e.duration * 60 * 1000;
      let startProfileTime = new Date(e.x).getTime();
      let endProfileTime = new Date(e.x).getTime() + durationms;
      var currTime = endProfileTime;

      lastVal = null;

      let firstbasalOffset = eProfile[eProfile.length - 1].timeAsSeconds * 1000;

      while (currTime >= startProfileTime) {
        eProfile.forEach((b, index) => {
          let bTime = returnDateWithHHMM(currTime, b.time); //create a time of b.time on same day as currTime
          var endTime = 0;;
          if (index == 0) { //last basal 
            endTime = new Date(currTime).setHours(23, 59, 59, 999) + firstbasalOffset;
          }
          else {
            endTime = returnDateWithHHMM(currTime, eProfile[index - 1].time);
          }
          if (endTime > endProfileTime) {
            endTime = startProfileTime + durationms;
          }
          if (endTime > lastProfileStartTime) {
            endTime = lastProfileStartTime;
          }

          if (endTime < startProfileTime) {
            currTime = startProfileTime + 1; //force while loop to quit
            return;
          }
          if(bTime < startProfileTime){
            bTime = startProfileTime;
          }
          if (bTime < endProfileTime
            && bTime > new Date().setTime(firstBGtime - 5 * 3600 * 1000)) {


            if (!lastVal) {
              tempBasProf.push([
                endTime,
                0
              ]);
            }
            tempBasProf.push([
              endTime,
              b.value
            ]);

            tempBasProf.push([
              bTime,
              b.value
            ])
            tempBasProf.push([
              bTime,
              0
            ])
            tempBasProf.push([
              bTime,
              null
            ])

            lastVal = b.value;

          }
          currTime = bTime;
        });
        currTime = new Date(new Date().setDate(new Date(currTime).getDate() - 1)).setHours(23, 59, 59, 999);

      }
      lastProfileStartTime = startProfileTime;

    });

    let tempBasLoop = [];
    tempBasal?.forEach((e, index) => {
      let t = new Date(e.x).getTime();
      if (t > firstBGtime) {
        tempBasLoop.push([
          t + e.duration,
          0
        ])

        tempBasLoop.push([
          t + e.duration,
          e.basal
        ])
        tempBasLoop.push([
          t,
          e.basal
        ])

        tempBasLoop.push([
          t,
          0
        ])
      }
    });







    let width, height, gradient;
    function getGradient(chart, opacity) {
      const yScale = chart.scales['y'];
      const yPosHigh = yScale.getPixelForValue(highThresh);
      const yPosLow = yScale.getPixelForValue(lowThresh);
      const { ctx, chartArea } = chart;

      const chartWidth = chartArea.right - chartArea.left;
      const chartHeight = chartArea.bottom - chartArea.top;
      if (!gradient || width !== chartWidth || height !== chartHeight) {

        // Create the gradient because this is either the first render
        // or the size of the chart has changed
        width = chartWidth;
        height = chartHeight;
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        const red = 'rgba(255,0,0,' + opacity + ')';
        const green = 'rgba(0,255,0,' + opacity + ')';
        const highTH = yPosHigh / height
        const lowTH = yPosLow / height
        gradient.addColorStop(1, red);
        gradient.addColorStop(highTH, red);
        gradient.addColorStop(highTH, green);
        gradient.addColorStop(lowTH, green);
        gradient.addColorStop(lowTH, red);
        gradient.addColorStop(0, red);
      }

      return gradient;
    }

    setChartData({
      //labels: sgv?.map(t => t.time),

      datasets: [
        {
          label: 'BG',
          data: bg,
          type: 'scatter',
          showLine: true,
          yAxisID: 'y',
          borderWidth: 0.5, //line width
          // borderColor: 'rgb(0, 200, 0)',
          //backgroundColor: 'rgba(0, 200, 0, 1)',
          borderColor: (context) => context.chart.chartArea ? getGradient(context.chart, 0.5) : null,
          backgroundColor: (context) => context.chart.chartArea ? getGradient(context.chart, .5) : null,
          fill: false
        }, {
          label: "basal",
          data: tempBasProf,
          type: 'scatter',
          showLine: true,
          yAxisID: 'y2',
          borderColor: RGB_red,
          backgroundColor: RGB_red,
          fill: false,
          pointRadius: 0,
        }, {
          label: "basal",
          data: basProf,
          type: 'scatter',
          showLine: true,
          yAxisID: 'y2',
          borderColor: 'rgb(0, 50, 128)',
          backgroundColor: 'rgba(0, 100, 255, 0.2)',
          fill: false,
          pointRadius: 0,
        }, {
          label: "temp basal",
          data: tempBasLoop,
          type: 'scatter',
          showLine: true,
          yAxisID: 'y2',
          borderColor: 'rgb(0, 50, 128)',
          backgroundColor: 'rgba(0, 100, 255, 0.2)',
          fill: true,
          pointRadius: 0,
        }
      ]
    });
  }

  // let timer;
  // function startFetch({ chart }) {
  //   const { min, max } = chart.scales.x;
  //   clearTimeout(timer);
  //   timer = setTimeout(() => {
  //     console.log('Fetched data between ' + min + ' and ' + max);
  //     chart.data.datasets[0].data = fetchData(min, max);
  //     chart.stop(); // make sure animations are not running
  //     chart.update('none');
  //   }, 500);
  // }

  var havPanned = false;
  const maxOffset = 1000 * 3600 * 2;
  const stepSize = 1000 * 60 * 30; //[ms/5min]
  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,

    legend: {
      position: 'top'
    },
    title: {
      display: true,
      text: 'KiteScout',
    },
    elements: {
      point: {
        radius: 3
      },
      line: {
        borderWidth: 1.5
      }
    },
    scales: {
      x: {
        // min: new Date().getTime() - 1000 * 3600 * 24 * 10,
        // max: new Date().getTime() - 1000 * 3600 * 24 * 7,
        min: new Date(Math.round((new Date().getTime() - 1000 * 3600 * 24) / stepSize) * stepSize),
        max: new Date().getTime() + maxOffset,
        grid: {
          display: false
        },
        type: 'time',
        // time: {
        //   unit: 'minute'
        // }


        ticks: {
          autoSkip: true,
          // autoSkipPadding: 20,
          maxTicksLimit: 10,
          stepSize: stepSize,
          maxRotation: 0,
          callback: (value, index, values) => {
            return value.includes('00:00') ? value : value.split(" - ")[1];
          }
        },
        time: {
          //round: true,
          displayFormats: { //beror på zoomen: 
            hour: 'DD/MM - HH:mm',
            minute: 'DD/MM - HH:mm',
            second: 'HH:mm'
          },
        }
      },

      y: {
        position: 'left',
        min: 0,
        max: sgv == undefined ? 20 : Math.ceil(Math.max(...sgv.map(x => x.bg)) / 5) * 5,
        ticks: {
          min: 0,
          stepSize: 1,
        },
        grid: {
          display: false,
        }
        //   // color: 'white'

        //   drawBorder: false,
        //   color: function (context) {
        //     if (context.tick.value == highThresh || context.tick.value == lowThresh) {
        //       return RGB_green;
        //     } else if (context.tick.value < 0) {
        //       return RGB_red;
        //     }

        //     return '#000000';
        //   },
        // }
      },
      y2: {
        position: 'right',
        min: 0,
        max: tempBasal == undefined ? 20 : Math.ceil(Math.max(...tempBasal.map(x => x.basal)) / 5) * 10,
        // ticks: {
        //   max: 10,
        //   min: 0
        // },
      },

    },
    plugins: {
      zoom: {
        limits: {
          x: { min: 0, max: new Date().getTime() + 1000 * 3600 * 24, minRange: 50 },
          //y: {min: -200, max: 200, minRange: 50}
        },
        zoom: {
          pinch: { //make sure you specify the width of the component when used...
            enabled: true,
          },
          drag: {
            enabled: true,
            modifierKey: "ctrl"
          },
          wheel: {
            enabled: true, // SET SCROOL ZOOM TO TRUE
            //modifierKey: "shift"
          },
          mode: "x",
          speed: 20,
          //onZoomComplete: startFetch
        },
        pan: {
          enabled: true,
          mode: "x",
          speed: 10,
          threashold: 10,
          //onPanComplete: (c) => updateLabelText(c.chart), //buggy, jumps back when setting a setState-varable!
          onPanStart: (c) => { havPanned = true; }
        }
      },
      annotation: {
        annotations: [
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y',
            value: lowThresh,
            borderColor: RGB_gray,
            borderWidth: 0.5,
            label: {
              enabled: false,
              content: 'Test label'
            }
          },
          {
            type: 'line',
            mode: 'horizontal',
            scaleID: 'y',
            value: highThresh,
            borderColor: RGB_gray,
            borderWidth: 0.5,
            label: {
              enabled: false,
              content: 'Test label'
            }
          },
          {
            mode: 'vertical',
            type: 'line',
            scaleID: 'x',
            //value: (c) => !havPanned ? c.chart.scales['x']._userMax - maxOffset : c.chart.scales['x']._userMax - (c.chart.scales['x']._userMax-c.chart.scales['x']._userMin)/4,
            value: redrawCurrBGLine,
            borderColor: RGB_gray,
            borderWidth: 0.5,
            label: {
              backgroundColor: RGB_gray,
              content: redrawCurrBGText,
              enabled: true,
              position: 'start', //position top
              yAdjust: 100, //down offset from position
            }
          },
        ]
      }

    },
  };

  var currBGLinePos = 0;
  var lastBGLinePos = -100;
  function redrawCurrBGLine(c) {
    currBGLinePos = !havPanned ? c.chart.scales['x']._userMax - maxOffset : c.chart.scales['x']._userMax - (c.chart.scales['x']._userMax - c.chart.scales['x']._userMin) / 4;
    return currBGLinePos;
  }
  function redrawCurrBGText(c) {
    //console.log(currBGLinePos);
    var retStr = "Hejhopp!";
    if (sgv) {
      let s = getNearestValue(currBGLinePos, sgv);
      retStr = [new Date(s.x).toLocaleString(), 'BG: ' + s.bg.toFixed(1)]
    }
    return retStr;
  }

  function getNearestValue(val, data) {
    return data.reduce((a, b) => Math.abs(new Date(b.x) - val) < Math.abs(new Date(a.x) - val) ? b : a)
  }

  return (
    <div className="App">
      {/* <div style={{height: "200px"}}></div> */}
      <Line className="MainChart"
        options={chartOptions}
        data={chartData}
        style={{ backgroundColor: "black", marginTop: "200px" }}
      />
    </div>
  );
}

export default App;
