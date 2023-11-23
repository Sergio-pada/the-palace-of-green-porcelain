# The Palace of Green Porcelain

A website for a fictional museum built by the main character of HG Wells' The Time Machine.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Acknowledgments](#acknowledgments)

## Introduction

This website is an online archive of exhibits for a fictional museum. The site uses a machine learning model built using TensorFlow.js to recommend exhibits to users based on their previous activity on the site. In addition to the machine learning model, the data on exhibits and users is aggregated and used for data visualizations on user activity.

## Features

• Express server.
• Machine learning model for user-behavior-analysis built using TensorFlow.js.
• Uses a PostgreSQL database for user and exhibit data.
• Data visualizations built using Charts.js accessable via the "/dashboard" route.
• Collection of fictional exhibits based on the objects encountered by The Time Traveller in HG Wells' The Time Machine.
• Hosted using Heroku.

## Getting Started

• The site can be accessed via the following URL: https://fathomless-woodland-38409-8d4eaec4d1f7.herokuapp.com/

## Usage

• All the exhibit pages can be accessed through the "/exhibits/:id" route where IDs range from 1-10
• Recomendations can be accessed through the "Suggestions" link on the home page.
• Data visualizations can be accessed through the "/dashboard" route.

## Acknowledgments

• Express.js - For server
• pgAdmin - For database
• Heroku - Hosting
• Tensorflow.js - For machine learning model
• cookie-parser(Library) - For user data collection
• uuid(Library) - For user ID generation
