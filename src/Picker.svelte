<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { utcToZonedTime, zonedTimeToUtc, format } from 'date-fns-tz';
  import { isValid, parseISO } from 'date-fns';
  import groupedZones from './timezones';
  import {
    scrollIntoView,
    uid,
    getKeyByValue,
    slugify,
    keyCodes,
    ungroupZones,
    filterZones,
    pickZones
  } from './utils';

  // ***** Public API *****

  // The datetime and timezone values come from the consumer of the component
  // If either is not provided, we will set them in onMount to be the current date and the user's timezone
  export let datetime = null;
  export let timezone = null;

  // Should the dropdown be expanded by default?
  export let expanded = false;

  // We can allow the user to filter the timezones displayed to only a few
  export let allowedTimezones = null;

  // ***** End Public API *****

  // We will use the dispatcher to send the update event
  const dispatch = createEventDispatcher();

  // What is the current zone?
  let currentZone;

  // We will always convert the datetime to UTC
  let utcDatetime;

  // We keep track of what the user is typing in the search box
  let userSearch;

  // What is the currently selected zone in the dropdown?
  let highlightedZone;

  // DOM nodes refs
  let toggleButtonRef;
  let searchInputRef;
  let clearButtonRef;
  let listBoxRef;
  let listBoxOptionRefs;

  // A few IDs that will we use for a11y
  const labelId = uid();
  const listBoxId = uid();
  const searchInputId = uid();

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // eslint-disable-line new-cap
  let availableZones;

  if (allowedTimezones) {
    if (Array.isArray(allowedTimezones)) {
      availableZones = pickZones(groupedZones, [
        ...allowedTimezones,
        userTimezone
      ]);
    } else {
      console.error(
        'You need to provide a list of timezones as an Array!',
        `You provided ${allowedTimezones}.`
      );
      availableZones = groupedZones;
    }
  } else {
    availableZones = groupedZones;
  }

  const ungroupedZones = ungroupZones(availableZones);

  // We take the ungroupedZones and create a list of just the user-visible lables
  // e.g. {'London': 'Europe/London', 'Berlin': 'Europe/Berlin' } => ['London', 'Berlin']
  const zoneLabels = Object.keys(ungroupedZones);

  // We also want a list of all the valid zones
  // e.g. {'London': 'Europe/London', 'Berlin': 'Europe/Berlin' } => ['Europe/London', 'Europe/Berlin']
  const validZones = Object.values(ungroupedZones);

  // Zones will be filtered as the user types, so we keep track of them internally here
  let filteredZones = [];

  listBoxOptionRefs = zoneLabels.map((zone) => ({ [zone]: null }));

  // We keep track of the initial state so we can reset to these values when needed
  const initialState = {
    expanded,
    userSearch: null
  };

  // Reset the dropdown and all internal state to the initial values
  const reset = () => {
    expanded = initialState.expanded; // eslint-disable-line prefer-destructuring
    userSearch = initialState.userSearch; // eslint-disable-line prefer-destructuring
  };

  const dispatchUpdates = () => {
    dispatch('update', {
      timezone,
      datetime,
      utcDatetime,
      zonedDatetime: utcToZonedTime(utcDatetime, timezone)
    });
  };

  // Emit the event back to the consumer
  const handleTimezoneUpdate = (ev, zoneId) => {
    currentZone = zoneId;
    timezone = ungroupedZones[zoneId];
    dispatchUpdates();
    reset();
    toggleButtonRef.focus();
    ev.preventDefault();
  };

  // ***** Methods *****

  // Given a Date and a timezone, give the correct Date and Time for that timezone
  const getTimeForZone = (d, t) => utcToZonedTime(d, t);

  // Figure out if a grouped zone has any currently visible zones
  // We use this when the user searches in order to show/hide the group name in the list
  const groupHasVisibleChildren = (group, zones) =>
    Object.keys(groupedZones[group]).some((zone) => zones.includes(zone));

  // Scroll the list to a specific element in it if that element is not already visible on screen
  const scrollList = (zone) => {
    const zoneElementRef = listBoxOptionRefs[zone];
    if (listBoxRef && zoneElementRef) {
      scrollIntoView(zoneElementRef, listBoxRef);
      zoneElementRef.focus({ preventScroll: true });
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

    // We update the highlightedZone to be the one the user is currently on
    highlightedZone = filteredZones[index];
    // We make sure the highlightedZone is visible on screen, scrolling it into view if not
    scrollList(highlightedZone);
  };

  // We watch for when the user presses Escape, ArrowDown or ArrowUp and react accordingly
  const keyDown = (ev) => {
    // If the clearButton is focused, don't do anything else
    // We should only continue if the dropdown is expanded
    if (document.activeElement === clearButtonRef || !expanded) {
      return;
    }

    // If the user presses Escape, we dismiss the drodpown
    if (ev.keyCode === keyCodes.Escape) {
      reset();
    }

    // If the user presses the down arrow, start navigating the list
    if (ev.keyCode === keyCodes.ArrowDown) {
      ev.preventDefault();
      moveSelection('down');
    }
    // If the user presses the up arrow, start navigating the list
    if (ev.keyCode === keyCodes.ArrowUp) {
      ev.preventDefault();
      moveSelection('up');
    }
    // If the user presses Enter and the dropdown is expanded, select the current item
    if (ev.keyCode === keyCodes.Enter && highlightedZone) {
      handleTimezoneUpdate(ev, highlightedZone);
    }
    // If the user start to type letters or numbers, we focus on the Search field
    if (
      keyCodes.Characters.includes(ev.keyCode) ||
      ev.keyCode === keyCodes.Backspace
    ) {
      searchInputRef.focus();
    }
  };

  // When the user presses the clear button when searching,
  // we want to clear the text and refocus on the input
  const clearSearch = () => {
    userSearch = initialState.userSearch; // eslint-disable-line prefer-destructuring
    // Refocus to the search input
    searchInputRef.focus();
  };

  const setHighlightedZone = (zone) => {
    highlightedZone = zone;
  };

  const toggleExpanded = (ev) => {
    if (ev.keyCode) {
      // If it's a keyboard event, we should react only to certain keys
      // Enter and Space should show it
      if ([keyCodes.Enter, keyCodes.Space].includes(ev.keyCode)) {
        expanded = !expanded;
      }
      // Escape should just hide the menu
      if (ev.keyCode === keyCodes.Escape) {
        expanded = false;
      }
      // ArrowDown should show it
      if (ev.keyCode === keyCodes.ArrowDown) {
        expanded = true;
      }
    } else {
      // If there is no keyCode, it's not a keyboard event
      expanded = !expanded;
    }
  };

  const scrollToHighlighted = () => {
    if (expanded && highlightedZone) {
      scrollList(highlightedZone);
    }
  };

  // ***** Reactive *****

  // As the user types, we filter the available zones to show only those that should be visible
  $: filteredZones =
    userSearch && userSearch.length > 0
      ? filterZones(userSearch, zoneLabels)
      : zoneLabels.slice();

  const setTimezone = (tz) => {
    if (!tz) {
      timezone = userTimezone;
    }

    if (tz && !Object.values(ungroupedZones).includes(tz)) {
      // The timezone must be a valid timezone, so we check it against our list of values in flat
      console.warn(
        `The timezone provided is not valid: ${tz}!`,
        `Valid zones are: ${validZones}`
      );
      timezone = userTimezone;
    }

    currentZone = getKeyByValue(ungroupedZones, timezone);
    setHighlightedZone(currentZone);
  };

  const setDatetime = (dt, tz) => {
    // Warn the user if the datetime is invalid
    if (dt && !isValid(parseISO(dt))) {
      console.warn(`The datetime provided is not a valid date: ${dt}`);
    }

    // If there is a valid datetime, update the utcDatetime
    if (dt && isValid(parseISO(dt))) {
      utcDatetime = zonedTimeToUtc(parseISO(dt), tz);
    }
  };

  // We want to properly handle any potential changes to the current timezone and datetime
  // that might come in from the consumer of the component.
  // This includes setting the proper timezone, datetime and dispatching the updated values
  // back up to the consumer
  $: setTimezone(timezone);
  $: setDatetime(datetime, timezone);
  $: utcDatetime && dispatchUpdates();

  // ***** Lifecycle methods *****
  onMount(() => {
    setTimezone(timezone);
    setDatetime(datetime, timezone);
    scrollToHighlighted();
  });
</script>

{#if expanded}
  <div class="overlay" on:click="{reset}"></div>
{/if}

<div class="tz-container">
  <button
    bind:this="{toggleButtonRef}"
    type="button"
    aria-label="{`${currentZone} is currently selected. Change timezone`}"
    aria-haspopup="listbox"
    data-toggle="true"
    aria-expanded="{expanded}"
    on:click="{toggleExpanded}"
    on:keydown="{toggleExpanded}"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 487.015 487.015"
      width="0.88em"
      height="0.88em"
    >
      <path
        d="M484.681
        213.47c-4.498-40.879-19.541-78.226-43.869-111.5-39.194-53.578-91.611-86.336-157.067-97.74-13.051-2.271-26.398-2.862-39.608-4.23h-2.622c-12.342
        1.351-24.737 2.246-36.993 4.129C78.665 23.442-12.331 142.612 2.056
        269.395 8.921 329.91 34.27 381.516 79.271 422.673c53.504 48.941 117.062
        69.925 189.118 63.079 55.301-5.271 103.557-27.573 143.33-66.489
        57.76-56.561 81.781-125.699 72.962-205.793zM433.4
        338.072c-6.153-10.729-13.92-25.688-17.39-38.455-5.042-18.537-17.147-.627-18.158
        11.479s-9.078 21.184-25.221
        3.025c-16.143-18.157-19.169-14.126-24.211-14.126s-14.121 12.104-12.105
        68.601c1.437 40.335 17.349 46.736 27.746 49.662-19.305 13.264-41.488
        23.714-66.385 30.038-95.157
        24.151-192.289-19.706-237.671-106.837-42.28-81.185-21.681-173.053
        21.299-223.616 1.156 9.094 2.288 17.263 3.23 25.464 2.562 22.39.629
        44.487-3.939 66.496-.976 4.69-.636 10.033.629 14.646.688 2.519 4.486
        5.494 7.11 5.743 2.066.201 5.671-3.074 6.508-5.533 1.513-4.397
        1.575-9.327 2.04-14.053.334-3.334.34-6.712.57-11.942 3.413 2.766 5.902
        4.444 7.971 6.525 5.272 5.308 10.604 10.592 15.415 16.299 2.125 2.533
        4.315 6.079 4.256 9.129-.133 6.525 2.73 10.962 6.227 16.086 3.886 5.698
        5.636 12.862 8.136 19.459 1.046 2.766 1.265 5.887 2.512 8.547 2.663
        5.697 6.688 9.599 13.607 10.024 7.279.461 10.004 3.286 11.05
        10.733-1.862.213-3.715.462-5.574.633-8.878.846-13.278 4.924-12.927
        13.879.694 17.785 7.11 33.324 20.312 45.678 3.638 3.411 7.503 6.579
        11.038 10.072 8.074 7.974 10.891 17.342 7.01 28.354-1.859 5.249-4.407
        10.403-5.231 15.83-.839 5.514-.845 11.508.432 16.904 1.324 5.615.756
        17.897 6.555 16.881 10.258-1.803 16.154.219
        16.952-11.266.151-2.188-.018-2.459-.6-4.48-3.05-10.781 10.799-41.387
        19.109-46.967 7.099-4.776 14.218-9.635 20.652-15.244 9.276-8.062
        13.429-18.477 9.531-30.605-3.668-11.414.623-19.795 8.603-27.143
        8.14-7.489 13.477-16.119
        12.921-27.645-.556-11.526-8.098-19.849-17.927-18.666-4.806.567-9.413
        2.872-14.098 4.45-6.868 2.323-13.571 5.574-20.62 6.839-9.88
        1.75-15.968-4.705-20.375-12.543-3.546-6.301-4.714-6.785-10.87-2.86-5.193
        3.322-10.376 6.667-15.755 9.67-5.588 3.121-8.633
        1.963-12.941-2.707-2.548-2.755-6.076-4.693-9.351-6.679-2.355-1.442-5.539-1.839-7.427-3.647-2.53-2.447-6.059-6.076-5.701-8.729.417-3.115
        4.025-7.014 7.172-8.29 5.423-2.199 11.585-2.554 17.401-3.818 3.097-.674
        6.239-1.375 9.167-2.53 4.008-1.599
        3.839-4.232.771-6.703-1.513-1.215-3.384-2.069-5.208-2.802-8.866-3.57-17.782-6.984-26.643-10.568-2.202-.884-4.371-1.971-6.348-3.263-5.571-3.661-6.242-7.692-1.188-12.152
        19.955-17.602 43.264-22.756 63.916.63 6.398 7.243 10.737 16.275 16.778
        23.876 4.752 5.994 10.223 11.621 16.263 16.246 2.489 1.9 8.086 2.223
        10.87.697 4.146-2.27 4.291-7.444
        2.205-11.759-1.803-3.748-3.922-7.442-6.469-10.722-11.733-15.117-10.926-44.576
        12.055-56.867 7.687-4.117 15.441-8.453 19.112-19.497-4.403 1.191-7.596
        1.959-10.723 2.917-17.451 5.405-5.302-7.613 2.726-9.883
        4.876-1.386-4.362-5.122-4.362-5.122.219-.381 6.135-2.069 12.714-4.874
        4.527-1.924 9.155-4.09 12.915-7.152 2.436-1.998 3.375-5.816
        4.977-8.819-.407-.473-.804-.934-1.217-1.407-4.611.621-9.216 1.303-13.838
        1.824-7.832.877-9.67-.659-10.396-8.559-.503-5.394-6-8.334-11.133-5.568-3.473
        1.883-6.476 4.613-9.818 6.773-7.716 4.998-13.485
        3-16.512-5.618-1.803-5.13-4.314-6.1-9.034-3.227-2.374 1.442-4.354
        3.549-6.768 4.897-3.958 2.211-7.982 4.43-12.232 5.932-4.14 1.466-9.126
        2.53-11.943-2.01-3.026-4.882-.381-9.635 3.435-12.696 4.743-3.807
        10.211-6.762 15.548-9.753 7.602-4.279 15.652-7.838 22.993-12.504
        5.388-3.438 7.743-9.041
        6-15.652-1.472-5.58-5.205-7.468-10.374-4.909-4.268 2.119-7.997
        5.435-12.386 7.143-3.207 1.229-7.203
        1.242-10.646.636-1.271-.225-2.622-3.747-2.657-5.792-.024-1.179
        2.367-3.227 3.892-3.476 10.604-1.652 21.255-3.05 31.921-4.265 1.41-.154
        3.529.718 4.413 1.844 7.045 8.893 16.875 13.208 27.216 16.287 8.688 2.58
        9.947 1.351 11.142-7.764 11.159-2.627 22.502-7.803 33.732-.721 6.23
        3.921 11.91 8.917 17.183 14.091 1.307 1.288.509 5.272-.118 7.838-.827
        3.448-2.736 6.635-3.617 10.083-1.702 6.682 2.618 11.904 9.522 11.795
        2.181-.047 4.356-.494 6.549-.603 6.378-.298 8.642 2.143 8.057 8.583-.828
        9.126.691 10.223 9.9 8.665 2.647-.446 5.704.756 8.405 1.703 1.607.567
        2.854 2.107 4.285 3.188 8.564 6.49 15.113 4.058
        17.62-6.561.271-1.156.236-2.391.473-3.559.993-4.764 3.683-5.99
        6.897-2.604 6.81 7.211 13.199 14.824 20.108 22.686-7.424 6.809-7.672
        15.084-6.028 23.193 1.826 9.021-.55 16.858-4.108 24.805-3.41 7.613-7.157
        15.179-9.434 23.144-3.404 11.955.461 17.416 12.602 20.062 11.585 2.529
        13.482 4.858 13.92 16.184.585 15.448 8.518 26.11 22.071 32.914 3.009
        1.501 6.206 2.642 9.279 3.919-1.519 23.814-8.317 48.598-19.949 72.111z"
      ></path>
    </svg>

    <span>
      {currentZone}
      {#if utcDatetime}
        ({format(utcDatetime, `'GMT' xxx`, { timeZone: timezone })})
      {/if}
    </span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 30.727 30.727"
      width="0.88em"
      height="0.88em"
    >
      <path
        d="M29.994 10.183L15.363 24.812.733 10.184a2.5 2.5 0
        113.536-3.536l11.095 11.093L26.461 6.647a2.5 2.5 0 113.533 3.536z"
        transform="{expanded ? 'rotate(180, 15.3635, 15.3635)' : 'rotate(0)'}"
      ></path>
    </svg>
  </button>
  {#if expanded}
    <div
      class="tz-dropdown"
      transition:slide
      on:introend="{scrollToHighlighted}"
      on:keydown="{keyDown}"
    >
      <label id="{labelId}">
        Select a timezone from the list. Start typing to filter or use the arrow
        keys to navigate the list
      </label>
      <div class="input-group">
        <!-- svelte-ignore a11y-autofocus -->
        <input
          id="{searchInputId}"
          bind:this="{searchInputRef}"
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
          <button
            bind:this="{clearButtonRef}"
            title="Clear search text"
            on:click="{clearSearch}"
          >
            <svg width="0.88em" height="0.88em" viewBox="0 0 23 23">
              <path
                fill="transparent"
                strokeWidth="3"
                stroke="hsl(0, 0%, 18%)"
                strokeLinecap="round"
                d="M 3 16.5 L 17 2.5"
              ></path>
              <path
                fill="transparent"
                strokeWidth="3"
                stroke="hsl(0, 0%, 18%)"
                strokeLinecap="round"
                d="M 3 2.5 L 17 16.346"
              ></path>
            </svg>

          </button>
        {/if}
      </div>

      <ul
        tabindex="-1"
        class="tz-groups"
        id="{listBoxId}"
        role="listbox"
        bind:this="{listBoxRef}"
        aria-labelledby="{labelId}"
        aria-activedescendant="{currentZone && `tz-${slugify(currentZone)}`}"
      >
        {#each Object.keys(groupedZones) as group}
          {#if groupHasVisibleChildren(group, filteredZones)}
            <li role="option" aria-hidden="true">
              <p>{group}</p>
            </li>
            {#each Object.keys(groupedZones[group]) as name}
              {#if filteredZones.includes(name)}
                <li
                  role="option"
                  tabindex="0"
                  id="{`tz-${slugify(name)}`}"
                  bind:this="{listBoxOptionRefs[name]}"
                  aria-label="{`Select ${name}`}"
                  aria-selected="{highlightedZone === name}"
                  on:mouseover="{() => setHighlightedZone(name)}"
                  on:click="{(ev) => handleTimezoneUpdate(ev, name)}"
                >
                  {name}
                  <span>
                    {utcDatetime && format(
                        getTimeForZone(utcDatetime, ungroupedZones[name]),
                        `'GMT' xxx`,
                        { timeZone: ungroupedZones[name] }
                      )}
                  </span>
                </li>
              {/if}
            {/each}
          {/if}
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
    color: var(--color-info-900, #076196);
    margin-left: 0.4em;
    margin-right: 0.4em;
    text-decoration: underline;
  }

  .tz-dropdown {
    background-color: var(--color-white, #fff);
    border: 1px solid var(--color-gray-100, rgba(0, 0, 0, 0.2));
    box-shadow: 0 1px 6px 0 var(--color-gray-100, rgba(0, 0, 0, 0.2));
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    min-width: 18em;
    max-width: 100vw;
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
    margin: 0;
    padding: 0;
    text-transform: uppercase;
  }

  ul li {
    background: transparent;
    border: 0;
    color: var(--color-gray-600, #757575);
    display: flex;
    justify-content: space-between;
    padding: 0.8em 1.2em;
    text-align: left;
  }

  ul li[aria-selected]:hover,
  ul li:focus,
  li[aria-selected='true'] {
    background: var(--color-info-900, #076196);
    color: #fff;
    cursor: pointer;
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
