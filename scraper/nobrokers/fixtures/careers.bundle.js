"use strict";
window.nobrokerCareers = function nobrokerCareersBundle() {
  var Q = {};
  firebase.initializeApp({
    apiKey: Q.firebaseApiKey,
    authDomain: Q.firebaseAuthDomain,
    databaseURL: Q.firebaseDatabaseURL,
  });
  firebase.database().ref("jobOpeningSheet").once("value", function onValue() {});
  window.open("https://www.linkedin.com/jobs/search/?f_C=9226228&locationId=OTHERS.worldwide", "_blank");
};
