const ping = require('ping');
const Jetty = require('jetty');

const jetty = new Jetty(process.stdout);

const printUpdate = (text, x = 0, y = 0, clear = true, clearLine = false) => {
  jetty.moveTo([y, x]);
  if (clearLine) jetty.clearLine();
  if (clear) jetty.clear();
  jetty.text(text);
};

const avg = (...arr) => {
  let avg = 0;
  let arrLength = arr.length;
  for (const arg of arr) {
    const num = parseFloat(arg);
    if (isNaN(num)) {
      arrLength--;
      continue;
    }
    avg += num;
  }
  return avg / arrLength;
};

const runPing = async (hosts, testsToRun = 100, averagingSize = 10, mtu = 500, dirtyRatio = 0.2) => {
  if (typeof hosts == 'string') hosts = [hosts];

  let times = [];
  let tmpAvg = 0;
  let failCount = 0;
  let successCount = 0;
  const speeds = [];

  for (let i = 0; i < testsToRun; ++i) {
    tmpAvg = 0;
    for (let host of hosts) {
      const res = await ping.promise.probe(host, {
        timeout: 1,
        packetSize: mtu,
      });
      res.avg = parseFloat(res.avg);
      tmpAvg += res.avg;
    }

    tmpAvg /= hosts.length;
    if (!isNaN(tmpAvg)) {
      times.push(tmpAvg);
      successCount++;
    }
    else {
      failCount++;
      if (i > 5 && failCount / successCount >= dirtyRatio) {
        const newMtu = await calibrateMTU(hosts, mtu - 25, true);
        await runPing(hosts, testsToRun, averagingSize, newMtu);
        return;
      }
    }
    if (times.length >= averagingSize) {
      const speed = (mtu * 2 / avg(times));
      printUpdate(`|__run ${i} (failed ${failCount})`, 0, 3, false, true);
      printUpdate(`   |  ${speed.toFixed(2)} Mb/s`, 0, 4, false, true);
      printUpdate(`   |  at ${mtu} Bytes`, 0, 5, false, true);
      printUpdate(`   |__with average ${avg(times).toFixed(2)}, debug::times [${times}]ms`, 0, 6, false, true);
      times = [];
      speeds.push(speed);
    }
  }
  printUpdate(`-> test done, average speed ${avg(speeds)}Mb/s`, 0, 7, false, true);
  printUpdate(``, 0, 8, false, true);
};


const calibrateMTU = async (hosts, startingMTU = 1500, retry = false) => {
  if (typeof hosts == 'string') hosts = [hosts];

  let mtu = startingMTU;
  let avg = NaN;
  printUpdate(retry ? 'recalibrating MTU, exceeded dirty ratio ' : 'finding ideal MTU');
  while (isNaN(avg)) {
    avg = 0;
    printUpdate(`-> trying ${mtu}`, 0, 1, false);
    for (let host of hosts) {
      const res = await ping.promise.probe(host, {
        timeout: 1,
        packetSize: mtu
      });
      avg += parseFloat(res.avg);
    }
    avg /= hosts.length;
    mtu -= 25;
  }

  printUpdate(`-> mtu found ${mtu}, debug::avg ${avg}ms`, 0, 2, false);
  printUpdate('', 0, 3, false);
  return mtu;
};


exports.default = {
  runPing,
  calibrateMTU
};