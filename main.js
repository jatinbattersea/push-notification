const applicationServerKey = "BDHpi7gABWvOmNiyzuhET2-C6HBasei0BAzcxpQGbbpr2rqH7q758MqkX6Jq9nBwEELC27pe-j7sOPTkz4gAKaI";
const SUBSCRIPTION_STATUS_KEY = 'pushSubscriptionStatus';

let serviceWorkerRegistration = null;
let isPushSubscribed = false;

window.addEventListener('load', function () {
    if (!('serviceWorker' in navigator)) {
        return;
    }
    if (!('PushManager' in window)) {
        return;
    }
    navigator.serviceWorker.register('sw.js')
        .then(function (registration) {
            serviceWorkerRegistration = registration;
            initializePushMessage();
            checkSubscriptionStatus();
        }).catch(function (error) {
            console.error('Unable to register service worker.', error);
        });
});

function initializePushMessage() {
    serviceWorkerRegistration.pushManager.getSubscription()
        .then(function (subscription) {
            isPushSubscribed = !(subscription === null);
            if (!isPushSubscribed) {
                const subscriptionStatus = localStorage.getItem(SUBSCRIPTION_STATUS_KEY);
                if (!subscriptionStatus) {
                    askForSubscription();
                } else {
                    // Check if the user is unsubscribed
                    updateSubscriptionOnServer(subscription, false)
                        .then(function (status) {
                            console.log('Unsubscribed successfully');
                        })
                        .catch(function (error) {
                            console.error('Error updating subscription on server:', error);
                        });
                }
            }
        });
}

function checkSubscriptionStatus() {
    serviceWorkerRegistration.pushManager.getSubscription()
        .then(function (subscription) {
            isPushSubscribed = !(subscription === null);
            if (!isPushSubscribed) {
                localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
            }
        });
}

function askForSubscription() {
    getNotificationPermission()
        .then(function (status) {
            subscribeUserToPush()
                .then(function () {
                    localStorage.setItem(SUBSCRIPTION_STATUS_KEY, 'subscribed');
                })
                .catch(function (error) {
                    alert('Error:' + error);
                });
        })
        .catch(function (error) {
            if (error === "support") {
                alert("Your browser doesn't support push messaging.");
            } else if (error === "denied") {
                alert('You blocked notifications.');
            } else if (error === "default") {
                alert('You closed the permission prompt. Please try again.');
            } else {
                alert('There was some problem. Please try again later.');
            }
        });
}

function unsubscribeUserFromPush() {
    serviceWorkerRegistration.pushManager.getSubscription()
        .then(function (subscription) {
            if (subscription) {
                subscription.unsubscribe()
                    .then(function (successful) {
                        if (successful) {
                            updateSubscriptionOnServer(null, false)
                                .then(function () {
                                    isPushSubscribed = false;
                                    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
                                })
                                .catch(function (error) {
                                    console.error('Error updating subscription on server:', error);
                                });
                        }
                    })
                    .catch(function (error) {
                        console.error('Error unsubscribing from push notifications:', error);
                    });
            }
        })
        .catch(function (error) {
            console.error('Error getting push subscription:', error);
        });
}

function getNotificationPermission() {
    return new Promise(function (resolve, reject) {
        if (!("Notification" in window)) {
            reject('support');
        } else {
            Notification.requestPermission(function (permission) {
                resolve(permission);
            });
        }
    });
}

function subscribeUserToPush() {
    const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
    };
    return new Promise(function (resolve, reject) {
        serviceWorkerRegistration.pushManager.subscribe(subscribeOptions)
            .then(function (subscription) {
                updateSubscriptionOnServer(subscription)
                    .then(function () {
                        isPushSubscribed = true;
                        resolve();
                    })
                    .catch(function (error) {
                        reject(error);
                    });
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

function updateSubscriptionOnServer(subscription = null, subscribe = true) {
    return new Promise(function (resolve, reject) {
        let extra = (subscribe) ? '?subscribe' : '?unsubscribe';
        fetch('save-subscription.php' + extra, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Bad status code from server');
                }
                return response.json();
            })
            .then(function (responseData) {
                if (responseData.status && responseData.status === 'ok') {
                    resolve();
                } else {
                    reject(responseData.message || 'Unknown error');
                }
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
