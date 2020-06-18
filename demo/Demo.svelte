<script>
  import Picker from '../src/Picker.svelte';
  import { zonedTimeToUtc } from 'date-fns-tz';
  import { format } from 'date-fns';

  let datetime = '2020-06-10T19:30';
  let timezone = 'Europe/London';

  let dt = zonedTimeToUtc(datetime, timezone);

  let payload = {
    datetime,
    timezone,
    dt
  };

  const update = (ev) => {
    payload.timezone = ev.detail.timezone;
    payload.dt = ev.detail.datetime;
  };
</script>

<div class="cols">
  <div class="col">
    <p>Somewhere in Haikuland...</p>
    <input type="datetime-local" value="{datetime}" />
    <Picker on:update="{update}" {datetime} {timezone} />
  </div>
  <div class="col">
    <p>The payload for the server will be:</p>
    <pre>{JSON.stringify(payload, null, 2)}</pre>
    <p>{format(payload.dt, "MMMM do, yyyy 'at' HH:mm aaaa")}</p>
  </div>
</div>

<style>
  .cols {
    background: #fafafa;
    border: 1px solid #ccc;
    border-radius: 4px;
    display: flex;
    margin: 2em 0;
  }

  .col {
    padding: 1em;
  }

  p {
    color: #9c9c9c;
    font-size: 0.8em;
  }

  pre {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 2px;
    padding: 0.4em;
  }

  input {
    margin: 0.4em 0 2em;
  }
</style>
