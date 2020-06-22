<script>
  import Picker from '../src/Picker.svelte';
  import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
  import { format, parseISO } from 'date-fns';

  let datetime = '2016-06-19T08:30';
  let timezone = 'Europe/London';
  // let datetime;
  // let timezone;

  let payload = {};

  const update = (ev) => {
    payload.datetime = ev.detail.datetime;
    payload.timezone = ev.detail.timezone;
    payload.utcDatetime = ev.detail.utcDatetime;
    payload.zonedDatetime = ev.detail.zonedDatetime;
  };
</script>

<div class="cols">
  <div class="col">
    <p>Somewhere in user land...</p>
    <input type="datetime-local" value="{datetime}" />
    <Picker on:update="{update}" {datetime} {timezone} />
  </div>
  {#if Object.keys(payload).length}
    <div class="col">
      <p>The payload for the server will be:</p>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
      <p>
        It will be {format(payload.zonedDatetime, "MMMM do, yyyy 'at' HH:mm aaaa")}
        in {payload.timezone}.
      </p>
      <p>UTC: {format(payload.utcDatetime, "MMMM do, yyyy 'at' HH:mm aaaa")}</p>
    </div>
  {/if}
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
