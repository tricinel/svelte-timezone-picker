<script>
  import {
    createEventDispatcher,
    onMount,
    onDestroy,
    afterUpdate
  } from 'svelte';
  import { slide } from 'svelte/transition';
  import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
  import { format, isValid } from 'date-fns';
  import groupedZones from './timezones.json';
  import {
    scrollIntoView,
    uid,
    getKeyByValue,
    slugify,
    keyCodes
  } from './utils';
  import IconWorld from './IconWorld.svelte';
  import IconArrow from './IconArrow.svelte';
  import IconClose from './IconClose.svelte';

  // ***** Public API *****

  // The datetime and timezone values come from the consumer of the component
  // If either is not provided, we will set them in onMount to be the current date and the user's timezone
  export let datetime = null;
  export let timezone = null;

  // Should the dropdown be open by default?
  export let open = false;

  // ***** End Public API *****

  // We will use the dispatcher to send the update event
  const dispatch = createEventDispatcher();

  // What is the current zone?
  let currentZone;

  // We will get a ref to the toggleButton so that we can manage focus
  let toggleButtonRef;

  // Emit the event back to the consumer
  const handleTimezoneUpdate = (event, zoneId) => {
    currentZone = zoneId;
    timezone = ungroupedZones[zoneId];
    reset();
    dispatch('update', {
      timezone,
      datetime: zonedTimeToUtc(datetime, timezone)
    });
    toggleButtonRef.focus();
    event.preventDefault();
  };

  // We keep track of the initial state so we can reset to these values when needed
  const initialState = {
    open,
    userSearch: null
  };

  // A few IDs that will we use for a11y
  const labelId = uid();
  const listBoxId = uid();
  const clearButtonId = uid();
  const searchInputId = uid();

  // We take the grouped timezones and flatten them so that they can be easily searched
  // e.g. { Europe: { 'London': 'Europe/London', 'Berlin': 'Europe/Berlin' } } => {'London': 'Europe/London', 'Berlin': 'Europe/Berlin' }
  const ungroupedZones = Object.values(groupedZones).reduce(
    (values, zone) => ({ ...values, ...zone }),
    {}
  );

  // We take the ungroupedZones and create a list of just the user-visible lables
  // e.g. {'London': 'Europe/London', 'Berlin': 'Europe/Berlin' } => ['London', 'Berlin']
  const zoneLabels = Object.keys(ungroupedZones);

  // We also want a list of all the valid zones
  // e.g. {'London': 'Europe/London', 'Berlin': 'Europe/Berlin' } => ['Europe/London', 'Europe/Berlin']
  const validZones = Object.values(ungroupedZones);

  // Zones will be filtered as the user types, so we keep track of them internally here
  let filteredZones = [];

  // We keep track of what the user is typing in the search box
  let userSearch;

  // What is the currently selected zone in the dropdown?
  let highlightedZone;

  // ***** Methods *****

  // Given a Date and a timezone, give the correct Date and Time for that timezone
  const getTimeForZone = (d, t) => utcToZonedTime(d, t);

  // Figure out if a grouped zone has any currently visible zones
  // We use this when the user searches in order to show/hide the group name in the list
  const groupHasVisibleChildren = (group, zones) =>
    Object.keys(groupedZones[group]).some((zone) => zones.includes(zone));

  // Scroll the list to a specific element in it if that element is not already visible on screen
  const scrollList = (zone) => {
    const listElement = document.getElementById(listBoxId);
    const zoneElement = document.getElementById(`tz-${slugify(zone)}`);
    if (listElement && zoneElement) {
      zoneElement.querySelector('button').focus();
      scrollIntoView(zoneElement, listElement);
    }
  };

  // Every time the user uses their keyboard to move up or down in the list,
  // we need to figure out if their at the end/start of the list and scroll the correct elements
  // into view
  const moveSelection = (direction) => {
    const len = filteredZones.length;
    const zoneIndex = filteredZones.findIndex(
      (zone) => zone === highlightedZone
    );

    let index;

    if (direction === 'up') {
      index = (zoneIndex - 1 + len) % len;
    }

    if (direction === 'down') {
      index = (zoneIndex + 1) % len;
    }

    event.preventDefault();
    // We update the highlightedZone to be the one the user is currently on
    highlightedZone = filteredZones[index];
    // We make sure the highlightedZone is visible on screen, scrolling it into view if not
    scrollList(highlightedZone);
  };

  // We watch for when the user presses Escape, ArrowDown or ArrowUp and react accordingly
  const handleKeydown = (ev) => {
    // If the clearButton is focused, don't do anything else
    if (document.activeElement === document.getElementById(clearButtonId)) {
      return;
    }

    // If the user presses Escape, we dismiss the drodpown
    if (ev.keyCode === keyCodes.Escape) {
      reset();
    }

    // If the user presses the down arrow, start navigating the list
    if (ev.keyCode === keyCodes.ArrowDown) {
      moveSelection('down');
    }
    // If the user presses the up arrow, start navigating the list
    if (ev.keyCode === keyCodes.ArrowUp) {
      moveSelection('up');
    }

    // If the user presses Enter, select the current item
    if (ev.keyCode === keyCodes.Enter && highlightedZone) {
      handleTimezoneUpdate(ev, highlightedZone);
    }

    // If the user start to type letters or numbers, we focus on the Search field
    if (keyCodes.Characters.includes(ev.keyCode)) {
      document.getElementById(searchInputId).focus();
    }
  };

  // Reset the dropdown and all internal state to the initial values
  const reset = () => {
    open = initialState.open;
    userSearch = initialState.userSearch;
  };

  // When the user presses the clear button when searching,
  // we want to clear the text and refocus on the input
  const clearSearch = () => {
    userSearch = initialState.userSearch;
    // Refocus to the search input
    document.getElementById(searchInputId).focus();
  };

  const setHighlightedZone = (name) => {
    highlightedZone = name;
  };

  const toggleOpen = () => {
    open = !open;
  };

  // ***** Reactive *****

  // As the user types, we filter the available zones to show only those that should be visible
  $: filteredZones =
    userSearch && userSearch.length > 1
      ? zoneLabels.filter((zoneLabel) =>
          zoneLabel.toLowerCase().includes(userSearch.toLowerCase())
        )
      : zoneLabels.slice();

  // ***** Lifecycle methods *****

  // Just in case we need to auto-update the date, we keep track of the intervalId
  // so that we can clear it and prevent memory leaks
  let intervalId;
  const UPDATE_INTERVAL = 1000 * 60; // 1 minute

  onMount(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      // The timezone must be a valid timezone, so we check it against our list of values in flat
      if (!Object.values(ungroupedZones).includes(timezone)) {
        console.warn(
          `The timezone provided is not valid: ${timezone}!`,
          `Valid zones are: ${validZones}`
        );
        timezone = userTimezone;
      }
    } else {
      timezone = userTimezone;
    }

    currentZone = getKeyByValue(ungroupedZones, timezone);

    if (datetime && !isValid(datetime)) {
      console.warn(`The datetime provided is not a valid date: ${datetime}`);
      datetime = new Date();
    }

    // If the user didn't pass a date, then we assume it's a picker,
    // and we update the time for each timezone every minute
    if (!datetime) {
      datetime = new Date();
      intervalId = setInterval(() => {
        datetime = new Date();
      }, UPDATE_INTERVAL);
    }
  });

  afterUpdate(() => {
    // We need to wait for the DOM to be in sync with our open state
    // and then scroll the list,
    // because only at this point do we have access to document.getElementById()
    if (open && highlightedZone) {
      scrollList(highlightedZone);
    }
  });

  onDestroy(() => {
    // Prevent memory leaks and clean up the interval
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

{#if open}
  <div class="overlay" on:click="{reset}"></div>
{/if}

<div class="tz-container">
  <button
    bind:this="{toggleButtonRef}"
    type="button"
    role="button"
    aria-label="{`${currentZone} is currently selected. Change timezone`}"
    aria-haspopup="listbox"
    data-toggle="true"
    aria-expanded="{open}"
    on:click="{toggleOpen}"
  >
    <IconWorld />
    <span>{currentZone}</span>
    {#if datetime}
      <small>({format(getTimeForZone(datetime, timezone), 'h:mm aaaa')})</small>
    {/if}
    <IconArrow transform="{open}" />
  </button>
  {#if open}
    <div class="tz-dropdown" transition:slide on:keydown="{handleKeydown}">
      <label id="{labelId}">
        Select a timezone from the list. Start typing to filter or use the arrow
        keys to navigate the list
      </label>
      <div class="input-group">
        <!-- svelte-ignore a11y-autofocus -->
        <input
          id="{searchInputId}"
          type="search"
          aria-autocomplete="list"
          aria-controls="{listBoxId}"
          aria-labelledby="{labelId}"
          autocomplete="off"
          autocorrect="off"
          placeholder="Search..."
          bind:value="{userSearch}"
          autofocus
        />

        {#if userSearch && userSearch.length > 0}
          <button title="Clear search text" on:click="{clearSearch}">
            <IconClose />
          </button>
        {/if}
      </div>

      <ul
        tabindex="-1"
        class="tz-groups"
        id="{listBoxId}"
        aria-labelledby="{labelId}"
      >
        {#each Object.keys(groupedZones) as group}
          <li>
            {#if groupHasVisibleChildren(group, filteredZones)}
              <p>{group}</p>
            {/if}
            <ul
              role="listbox"
              aria-activedescendant="{currentZone && `tz-${slugify(currentZone)}`}"
            >
              {#each Object.keys(groupedZones[group]) as name}
                {#if filteredZones.includes(name)}
                  <li
                    id="{`tz-${slugify(name)}`}"
                    role="option"
                    aria-selected="{highlightedZone === name}"
                  >
                    <button
                      on:click="{(event) => handleTimezoneUpdate(event, name)}"
                      on:mouseover="{() => setHighlightedZone(name)}"
                      aria-label="{`Select ${name}`}"
                    >
                      {name}
                      <span>
                        {datetime && format(getTimeForZone(datetime, ungroupedZones[name]), 'h:mm aaaa')}
                      </span>
                    </button>
                  </li>
                {/if}
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .overlay {
    background: transparent;
    height: 100vh;
    left: 0;
    position: fixed;
    top: 0;
    width: 100vw;
    z-index: 0;
  }

  .tz-container {
    position: relative;
    z-index: 1;
  }

  button {
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  button[data-toggle] {
    align-content: flex-start;
    align-items: center;
    display: flex;
  }

  button[data-toggle] > span {
    margin-left: 0.4em;
  }

  button[data-toggle] > span,
  button[data-toggle] > small {
    margin-right: 0.4em;
  }

  .tz-dropdown {
    background-color: #fff;
    border: 1px solid rgba(0, 0, 0, 0.2);
    box-shadow: 0 1px 6px 0 rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    position: absolute;
    z-index: 50;
  }

  .tz-groups {
    height: 240px;
    max-height: 40vh;
    overflow: scroll;
  }

  ul {
    margin: 0;
    list-style: none inside none;
    padding: 0;
  }

  ul li {
    font-size: 0.9rem;
    display: block;
    margin: 0;
    padding: 0;
  }

  ul li p {
    color: var(--color-gray-900, #292929);
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    padding-left: 0.8em;
    text-transform: uppercase;
  }

  ul li button {
    background: transparent;
    border: 0;
    color: var(--color-gray-600, #757575);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    padding: 0.8em 1.2em;
    text-align: left;
    width: 100%;
  }

  ul li button:hover,
  ul li button:focus,
  li[aria-selected='true'] button {
    background: var(--color-info, #076196);
    color: #fff;
  }

  .input-group {
    display: flex;
    position: relative;
  }

  .input-group > button {
    position: absolute;
    top: 1.2em;
    right: 0.8em;
  }

  input {
    border: 1px solid var(--color-gray-400, #acacac);
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
    margin: 0.4em;
    padding: 0.6em 1.6em 0.6em 0.4em;
    width: calc(100% - 0.8em);
  }

  label {
    border: 0;
    clip: 'rect(0, 0, 0, 0)';
    height: 1px;
    margin: -1px;
    opacity: 0;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
</style>
