
[![PyPI status](https://img.shields.io/pypi/status/ansicolortags.svg)](https://pypi.python.org/pypi/ansicolortags/) 

# Apigee Edge - Application Integration

**This is not an official Google product.**<BR>This implementation is not an official Google product, nor is it part of an official Google product. Support is available on a best-effort basis via GitHub.

***

## Intro

This repository contains a proxy for Apigee Edge only to call a [Google Cloud Application Integration](https://cloud.google.com/application-integration?hl=en) Flow. 
>It doesn't use Apigee Edge extension features.


The flow principle is:
1. Retrieve Service Account JSON Key from KVM (Policy KV.Lookup-SA-Key)
2. Set OAuth 2.0 Scopes for Google APIs (Policy AM.GCPScopes)
3. Call Sharedflow to get an Access Toke (Policy FC.gcpAuthent)
4. Extract one parameter from URL (Polices AM-setProductID and EV-getProductID)
5. Set Header and Payload required by GCP Application Integration (Policy AM-setIntegrationVariables)
6. Call the GCP Application Integration [projects.locations.integrations.execute API](https://cloud.google.com/application-integration/docs/reference/rest/v1/projects.locations.integrations/execute)
7. Extract Data from returned payload (Policy JS-formatResponse)


![Proxy Overview](/images/trace.png)

## Requirement

- A Google Cloud Platform account 
- A Google Cloud Application Integration  
- An Apigee Edge organization 


## Installation


1. If needed, deplay Application Integration Service and create an Integration Flow, having an API trigger.

> The Apigee proxy provided was designed to call this Application Integration Flow, having one input string parameter : **productID**

![applicationIntegrationFlow](/images/applicationIntegrationFlow.png)

2. Create GCP Service Accounts<BR>To authorize Apigee Edge to use Google Cloud Application Integration, you must first: 
    - Create a service account in Google Cloud and assign it the necessary roles to execute your Application Integration flow: depending on the resource type, **integrations.apigeeIntegrations.invoke** or **integrations.integrations.invoke** (see [Applicaton Integration execute: IAM permissions](https://cloud.google.com/application-integration/docs/reference/rest/v1/projects.locations.integrations/execute#iam-permissions) and [Understanding GCP roles](https://cloud.google.com/iam/docs/understanding-roles)).
    - Create a key and download the json key file for the service account


3. Create a KVM in the target Apigee Environment. <BR>Add an **encrypted** KVM entry in it. Paste the JSON content of the Service Account JSON key file, downloaded in step 2.

4. Install Apigee GCP SA Shareflow<BR>This sharedflow is used to obtain access tokens for Google Cloud service accounts. Access tokens are cached in a dedicated environment cache resource for 10min, and used to call GCP services.<BR>Source: [Github Apigee Devrel SA Auth Sharedflow](https://github.com/apigee/devrel/tree/main/references/gcp-sa-auth-shared-flow).

    Exemple: straight deployment to Apigee Edge using [Sackmesser](https://github.com/apigee/devrel/tree/main/tools/apigee-sackmesser). 


    ```bash
    export APIGEE_EDGE_USR=<YOUR-USER-NAME>
    export APIGEE_EDGE_PWD=<YOUR-USER-PASSWORD>
    export APIGEE_EDGE_ORG=<YOUR-ORG-NAME>
    export APIGEE_EDGE_ENV=<YOUR-ENV-NAME>
    sackmesser deploy --apigeeapi -u $APIGEE_EDGE_USR -p $APIGEE_EDGE_PWD \
    -o $APIGEE_EDGE_ORG -e $APIGEE_EDGE_ENV \ 
    -g https://github.com/apigee/devrel/tree/main/references/gcp-sa-auth-shared-flow
    ```

5. Deploy this proxy to your Apigee organization

    Exemple: straight deployment to Apigee Edge using [Sackmesser](https://github.com/apigee/devrel/tree/main/tools/apigee-sackmesser).

    ```
    export APIGEE_EDGE_USR=<YOUR-USER-NAME>
    export APIGEE_EDGE_PWD=<YOUR-USER-PASSWORD>
    export APIGEE_EDGE_ORG=<YOUR-ORG-NAME>
    export APIGEE_EDGE_ENV=<YOUR-ENV-NAME>

    sackmesser deploy --apigeeapi -u $APIGEE_EDGE_USR -p $APIGEE_EDGE_PWD \
    -o $APIGEE_EDGE_ORG -e $APIGEE_EDGE_ENV  
    ```
> you can also use Apigee Edge UI, [Apigee Edge Deploy Maven Plugin](https://github.com/apigee/apigee-deploy-maven-plugin/tree/1.x) or [apigeetool](https://github.com/apigee/apigeetool-node),  to deploy the proxy.


## Configuration]
1. Configure this proxy
    

    1. Update AM-setIntegrationVariables policy.<BR>Set **gcp.projectid** and **gcp.topicid** value with your GCP Project ID and PubSub topic:

        ``` xml
        <AssignVariable>
            <Name>ProjectId</Name>
            <Value>xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>IntegrationName</Name>
            <Value>xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>ApiTrigger</Name>
            <Value>api_trigger/xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>Region</Name>
            <Value>xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>parameters_keys_values_string</Name>
            <Template>{"productID":{"string_value":"{productID}"}}</Template>
        </AssignVariable>
        ```

2. Save and deploy proxy

## Test

You can now test your proxy.

``` bash
curl -i -X GET  'https://<YOUR-HOSTNAME>/v1/appint'
```

``` json
[
  {
    "id": "0PUK6V6EV0",
    "name": "Vintage Record Player",
    "description": "It still works.",
    "picture": "/img/products/record-player.jpg",
    "priceUsd": 65.5,
    "categories": "music"
  },
  ...
  {
    "id": "2ZYFJ3GM2N",
    "name": "Film Camera",
    "description": "This camera looks like it's a film camera, but it's actually digital.",
    "picture": "/img/products/film-camera.jpg",
    "priceUsd": 2244.99,
    "categories": "photography"
  }
]
```


``` bash
curl -i -X GET  'https://<YOUR-HOSTNAME>/v1/appint/<YOUR-PRODUCT-ID>'
```


```json
{
  "id": "1YMWWN1N4O",
  "name": "Home Barista Kit",
  "description": "Always wanted to brew coffee with Chemex and Aeropress at home?",
  "picture": "/img/products/barista-kit.jpg",
  "priceUsd": 123.99,
  "categories": "cookware"
}
```



Et voilà !!