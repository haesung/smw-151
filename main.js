/**
 * main.js ghp
 * (C)2022 Haesung Kim, All Rights Reserved
 * ------------------------------------------------------------------
 * v1.0.0  2022.11.15 1st cut
 * - @1 smw specific code
 * ------------------------------------------------------------------
 */
'use strict';
const my = {};

const makePages = function makePages() {
  // must be live -> 'querySelector().selected = true' not work
  document.querySelector(`select option[value=${my.page}]`)
    .outerHTML = `<option value="${my.page}" selected>${my.page}</option>`;

  // remove 'result' from the ui properties
  my.pages = Object.keys(my.ui);
  my.pages.splice(my.pages.indexOf('result'), 1);

  // append test/find form to left panel
  let pagesHtml = my.pages.reduce((acc1, page) => {
    acc1 += `<form id="${page}">`;
    acc1 += my.ui[page].reduce((acc2, name) => {
      const myAttribute = my.attribute[name];
      acc2 += `${myAttribute.text}<br>`;
      switch (myAttribute.type) {
        case 'radio': {
          const myAttributeMap = myAttribute.map;
          const defaultValue = myAttribute.defaultValue;
          acc2 += myAttribute.values.reduce((acc3, value) => {
            const text = myAttributeMap ? myAttributeMap[value] : value;
            acc3 += `
              <label>
                <input type="radio" name="${name}" value="${value}"
            `;

            if (value === defaultValue) acc3 += ' checked';
            return acc3 += `>${text}</label><br>`;
          }, '');
          break;
        }
        case 'number':
          acc2 += `
            <input
              type="number"
              name="${name}"
              value="${myAttribute.defaultValue}"
              min="${myAttribute.values[0]}"
              max="${myAttribute.values[1]}"
              step="${myAttribute.values[2]}"
              placeholder="${myAttribute.placeholder}"
            required><br>
          `;
          break;
        default: { // tel, url, text type
          acc2 += `
            <input
              type="${myAttribute.type}"
              name="${name}"
              value="${myAttribute.defaultValue}"
              placeholder="${myAttribute.placeholder}"
            required><br>
          `;
        }
      }

      return `${acc2}<br>`;
    }, '');

    return `${acc1}</form>`;
  }, '');

  pagesHtml += '<button id="go" class="button-go">GO</button>';
  const element = document.querySelector('#pages');
  element.innerHTML += pagesHtml;
};

// show only selected page (find or test) contents
const showMyPage = function showMyPage() {
  my.pages.forEach((key) => {
    if (my.page === key) {
      document.querySelector(`#${key}`).style.display = '';
    } else {
      document.querySelector(`#${key}`).style.display = 'none';
    }
  });
};

const onSubmit = async function onSubmit() {
  try {
    let query = {};
    const myForm = document.forms.namedItem(my.page);
    const itemCount = myForm.length;
    for (let i = 0; i < itemCount; i += 1) {
      const item = myForm.elements[i];
      if (item.type === 'radio') {
        if ((item.checked) && (item.value !== 'n/a')) {

          // handle array string value for cosine similarity
          if (item.value[0] === '[') {
            query[item.name] = JSON.parse(item.value);
          } else {
            query[item.name] = item.value;
          }
        }
      } else {
        if (! item.validity.valid) {
          const itemText = my.attribute[item.name].text;
          const inform = `"${itemText}" 항목을 입력하세요.`;
          document.querySelector('#right').innerHTML = `${inform}`;
          return;
        }

        query[item.name] = item.value;
      }
    }

    if (query._test && my.thing) {
      query = my.thing[query._test];
    }

    // @1 attribute map -> euCountry to euRegion
    if (query.euRegion === undefined) {
      const euCountry = my.attribute.euCountry;
      query.euRegion = euCountry.map2region[query.euCountry];
    }

    const cbrFindCase = 'https://ab6q65qx3onob2ns7g5smn37uy0pqjky.lambda-url.ap-northeast-2.on.aws/';
    const res = await fetch(cbrFindCase, {
      method: 'post',
      body: JSON.stringify({ query, appId: my.appId }),
    });

    const bestCases = await res.json();
    let text = `
      <table>
        <thead>
          <tr>
            <th></th>
            <th>${bestCases[0].caseObject.sk}</th>
            <th>${bestCases[1].caseObject.sk}</th>
          </tr>
          <tr>
            <th>유사도 (%)</th>
            <th>${(100*bestCases[0].similarity).toFixed(2)}</th>
            <th>${(100*bestCases[1].similarity).toFixed(2)}</th>
          </tr>
        </thead>
        <tbody>
    `;

    const attrList = my.attribute;
    const uiResult = my.ui.result;
    text += uiResult.reduce((acc1, name) => {
      const myAttribute = attrList[name];
      const myAttributeMap = myAttribute.map;
      const values = bestCases.map((myCase) => {
        let value = myCase.caseObject[name];

        // check undefined, url type, array/object type, text mapping
        if (value === undefined) return '-';
        if (value.slice(0, 4) === 'http') {
          return `<a href="${value}" target="_blank">click</a>`;
        }

        if (typeof value === 'object') value = JSON.stringify(value);
        if (myAttributeMap) value = myAttributeMap[value];
        return value;
      });

      acc1 += `
        <tr>
          <td>${myAttribute.text}</td>
          <td>${values[0]}</td>
          <td>${values[1]}</td>
        </tr>
      `;

      return acc1;
    }, '');

    // append best cases to right panel
    text = `${text}</tbody></table>`;
    document.querySelector('#right').innerHTML = text;

  } catch (e) {
    console.error('onSubmit:', e.message);
  }
};

const iife = (async function iife() {
  try {
    my.appId = location.pathname.split('/')[1]; // smw-151
    if (localStorage.getItem('appId') === my.appId) {
      my.attribute = JSON.parse(localStorage.getItem('attribute'));
      my.ui = JSON.parse(localStorage.getItem('ui'));
      my.thing = JSON.parse(localStorage.getItem('thing'));
      my.page = localStorage.getItem('page');
    } else {
      const cbrGetUi = 'https://iawlfv4oaf4ksegek6b4lsim4u0vekmi.lambda-url.ap-northeast-2.on.aws/';
      const res = await fetch(cbrGetUi, {
        method: 'post',
        body: my.appId,
      });

      const uiObject = await res.json();
      my.attribute = uiObject.attribute;
      my.ui = uiObject.ui;
      my.thing = uiObject.thing;
      my.page = 'find';
      localStorage.clear();
      localStorage.setItem('appId', my.appId);
      localStorage.setItem('attribute', JSON.stringify(my.attribute));
      localStorage.setItem('ui', JSON.stringify(my.ui));
      localStorage.setItem('thing', JSON.stringify(my.thing));
      localStorage.setItem('page', my.page);
    }

    makePages();
    showMyPage();
    document.querySelector('#pages').style.display = '';

    // prevent from flicker (body was set display:none)
    document.querySelector('body').style.display = '';

    document.querySelector('select').addEventListener('change', (e) => {
      my.page = e.target.value;
      localStorage.setItem('page', my.page);
      showMyPage();
    });

    document.querySelector('#go').addEventListener('click', onSubmit);

    // update attribute default values of current page
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { // alert('hide');
        const myForm = document.forms.namedItem(my.page);
        const itemCount = myForm.length;
        for (let i = 0; i < itemCount; i += 1) {
          const item = myForm.elements[i];
          if (item.type === 'radio') {
            if (item.checked) my.attribute[item.name].defaultValue = item.value;
          } else {
            my.attribute[item.name].defaultValue = item.value;
          }
        }

        localStorage.setItem('attribute', JSON.stringify(my.attribute));
      } // else alert('show');
    });

  } catch (e) {
    console.error('iife:', e.message);
  }
}());
