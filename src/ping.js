const ping = require('ping');
const Jetty = require('jetty');

const jetty = new Jetty(process.stdout);

const printUpdate = (text, x = 0, y = 0, clear = true, clearLine = false) => {
  if (clearLine) jetty.clearLine();
  if (clear) jetty.clear();
  jetty.moveTo([y, x]);
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

const runPing = async (hosts, testsToRun = 100, averagingSize = 10, mtu = 500) => {
  if (typeof hosts == 'string') hosts = [hosts];

  let times = [];
  const speeds = [];
  let tmpAvg = 0;
  let failCount = 0;

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
    }
    else {
      failCount++;
      if (failCount >= 10) {
        const newMtu = await calibrateMTU(hosts, mtu - 25, true);
        await runPing(hosts, testsToRun, averagingSize, newMtu);
        return;
      }
    }
    if (times.length >= averagingSize) {
      const speed = (mtu * 2 / avg(times));
      printUpdate(`run ${i} (failed ${failCount})\n  ${speed.toFixed(2)} Mb/s\n  at ${mtu} Bytes\n  with average ${avg(times).toFixed(2)}, debug::times [${times}]ms`, 0, 3, false, true);
      times = [];
    }
  }
  printUpdate(``, 0, 7, false, false);
};


const calibrateMTU = async (hosts, startingMTU = 1500, retry = false) => {
  if (typeof hosts == 'string') hosts = [hosts];

  let mtu = startingMTU;
  let avg = NaN;
  printUpdate(retry ? 'recalibrating MTU as 10 tests failed' : 'finding ideal MTU');
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