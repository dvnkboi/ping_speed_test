const { ArgumentParser } = require('argparse');
const ping = require('./src/ping').default;

const parser = new ArgumentParser({
  description: 'nodejs ping based speed test with multiple hosts'
});

parser.add_argument('-p', '--ping', { help: 'comma seperacted hosts to run program with', default: 'google.com' });
parser.add_argument('-t', '--test', { help: 'number of tests to run', default: '100' });
parser.add_argument('-a', '--averaging', { help: 'number of tests to average with', default: '10' });
parser.add_argument('-m', '--mtu', { help: 'the starting MTU to test with, if failed will find the closest MTU with a successful ping', default: '1500' });

(async () => {
  const args = parser.parse_args();
  args.ping = args.ping.trim().toLowerCase().split(',');
  args.tests = parseInt(args.tests);
  args.averaging = parseInt(args.averaging);
  args.mtu = parseInt(args.mtu);

  const mtu = await ping.calibrateMTU(args.ping, args.mtu);
  await ping.runPing(args.ping, args.tests, args.averaging, mtu);
})();
